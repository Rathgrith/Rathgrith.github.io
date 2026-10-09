// Offline multitimbral General MIDI renderer. The installed soundbank stays local.
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>
static void check(BOOL ok, NSError *error) {
    if (!ok) { NSLog(@"MIDI rendering failed: %@", error); exit(1); }
}
int main(int argc, const char *argv[]) {
    @autoreleasepool {
        if (argc != 3) return 1;
        NSError *error = nil;
        NSArray *events = [NSJSONSerialization JSONObjectWithData:[NSData dataWithContentsOfFile:@(argv[1])] options:0 error:&error];
        check(events != nil, error);
        AVAudioEngine *engine = [AVAudioEngine new];
        AVAudioFormat *format = [[AVAudioFormat alloc] initStandardFormatWithSampleRate:44100 channels:2];
        NSMutableDictionary<NSNumber *, AVAudioUnitSampler *> *parts = [NSMutableDictionary new];
        NSURL *bank = [NSURL fileURLWithPath:@"/System/Library/Components/CoreAudio.component/Contents/Resources/gs_instruments.dls"];
        for (NSDictionary *event in events) {
            NSNumber *channel = event[@"channel"];
            if (parts[channel]) continue;
            AVAudioUnitSampler *part = [AVAudioUnitSampler new];
            [engine attachNode:part];
            [engine connect:part to:engine.mainMixerNode format:format];
            check([part loadSoundBankInstrumentAtURL:bank program:0 bankMSB:channel.intValue == 9 ? kAUSampler_DefaultPercussionBankMSB : kAUSampler_DefaultMelodicBankMSB bankLSB:0 error:&error], error);
            parts[channel] = part;
        }
        // Leave headroom for dense ensembles; loudness is normalized after rendering.
        engine.mainMixerNode.outputVolume = 0.3;
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
        for (NSDictionary *event in events) {
            render([event[@"time"] doubleValue]);
            NSNumber *channel = event[@"channel"];
            AVAudioUnitSampler *part = parts[channel];
            NSArray *bytes = event[@"bytes"];
            UInt8 status = [bytes[0] unsignedCharValue], data1 = [bytes[1] unsignedCharValue];
            UInt8 data2 = bytes.count > 2 ? [bytes[2] unsignedCharValue] : 0;
            if ((status & 0xf0) == 0xc0) {
                check([part loadSoundBankInstrumentAtURL:bank program:data1 bankMSB:channel.intValue == 9 ? kAUSampler_DefaultPercussionBankMSB : kAUSampler_DefaultMelodicBankMSB bankLSB:0 error:&error], error);
            } else {
                [part sendMIDIEvent:status data1:data1 data2:data2];
            }
        }
        render([events.lastObject[@"time"] doubleValue] + 4);
        [engine stop];
    }
    return 0;
}
