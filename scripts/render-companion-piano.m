// Offline macOS renderer. The installed piano soundbank is never redistributed.
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>

static void check(BOOL ok, NSError *error) {
    if (!ok) { NSLog(@"Piano rendering failed: %@", error); exit(1); }
}
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) return 1;
        NSError *error = nil;
        NSArray *notes = [NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:@(argv[1])] options:0 error:&error];
        check(notes != nil, error);
        AVAudioEngine *engine = [AVAudioEngine new];
        AVAudioUnitSampler *piano = [AVAudioUnitSampler new];
        AVAudioUnitReverb *reverb = [AVAudioUnitReverb new];
        AVAudioUnitEQ *eq = [[AVAudioUnitEQ alloc] initWithNumberOfBands:2];
        AVAudioFormat *format = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:44100 channels:2];
        [engine attachNode:piano]; [engine attachNode:eq]; [engine attachNode:reverb];
        [engine connect:piano to:eq format:format];
        [engine connect:eq to:reverb format:format];
        [engine connect:reverb to:engine.mainMixerNode format:format];
        eq.bands[0].filterType = AVAudioUnitEQFilterTypeHighPass;
        eq.bands[0].frequency = 55; eq.bands[0].bypass = NO;
        eq.bands[1].filterType = AVAudioUnitEQFilterTypeHighShelf;
        eq.bands[1].frequency = 2600; eq.bands[1].gain = -4; eq.bands[1].bypass = NO;
        [reverb loadFactoryPreset:AVAudioUnitReverbPresetMediumHall]; reverb.wetDryMix = 13;
        check([piano loadSoundBankInstrumentAtURL:[NSURL fileURLWithPath:@"/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls"] program:0 bankMSB:kAUSampler_DefaultMelodicBankMSB bankLSB:0 error:&error], error);
        check([engine enableManualRenderingMode:AVAudioEngineManualRenderingModeOffline format:format maximumFrameCount:4096 error:&error], error);
        AVAudioFile *output = [[AVAudioFile alloc] initForWriting:[NSURL fileURLWithPath:@(argv[2])] settings:format.settings error:&error];
        check(output != nil, error);
        AVAudioPCMBuffer *buffer = [[AVAudioPCMBuffer alloc] initWithPCMFormat:format frameCapacity:4096];
        check([engine startAndReturnError:&error], error);
        void (^render)(double) = ^(double seconds) {
            AVAudioFramePosition end = seconds * format.sampleRate;
            int retries = 0;
            while (engine.manualRenderingSampleTime < end) {
                NSError *renderError = nil;
                AVAudioFrameCount frames = (AVAudioFrameCount)MIN(4096, end - engine.manualRenderingSampleTime);
                AVAudioEngineManualRenderingStatus status = [engine renderOffline:frames toBuffer:buffer error:&renderError];
                if (status == AVAudioEngineManualRenderingStatusSuccess) {
                    check([output writeFromBuffer:buffer error:&renderError], renderError);
                    retries = 0;
                } else { check(++retries < 100, renderError); }
            }
        };
        for (NSDictionary *note in notes) {
            render([note[@"time"] doubleValue]);
            UInt8 pitch = [note[@"note"] unsignedCharValue], velocity = [note[@"velocity"] unsignedCharValue];
            if (velocity) [piano startNote:pitch withVelocity:velocity onChannel:0];
            else [piano stopNote:pitch onChannel:0];
        }
        render([notes.lastObject[@"time"] doubleValue] + 5);
        [engine stop];
    }
    return 0;
}
