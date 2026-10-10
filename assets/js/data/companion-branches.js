/* Original fan-written conversations. Choices follow the current conversation;
 * each answer and follow-up is directed independently, never selected by mood.
 * affinityLines supply the leaf's line at the four existing trust tiers.
 */
(function (root) {
  "use strict";
  function line(text, expression, pose, effect) {
    return {
      text: text,
      expressionMotionId: expression,
      poseId: pose,
      effect: effect,
    };
  }
  function choice(label, next, delta) {
    return { label: label, next: next, delta: delta };
  }
  root.CompanionBranches = {
    alice: {
      topics: [
        { id: "daily", label: "工房でひと息", entry: "daily" },
        { id: "outing", label: "出かける支度", entry: "outing" },
        { id: "danmaku", label: "人形と弾幕", entry: "danmaku" },
      ],
      nodes: {
        daily: {
          lines: [line("今日は作業台を空けてあるの。……珍しい？ 作業をしない時間くらい、私にだってあるわ。", "07", "2", "none")],
          choices: [
            choice("棚の並べ方が気になる", "daily:shelves", 1),
            choice("いつもこんなに静か？", "daily:quiet", 0),
            choice("休む時は何をするの？", "daily:break", 1),
          ],
        },
        "daily:shelves": {
          lines: [line("よく使うものを手前に置いているだけよ。色を揃えるのは、その後。綺麗でも探せなければ困るでしょう。", "01", "5", "none")],
          choices: [
            choice("使いやすさを優先するんだね", "daily:shelves:order", 1),
            choice("奥の箱を開けてもいい？", "daily:shelves:box", 0),
          ],
        },
        "daily:shelves:order": {
          lines: [line("ええ。でも、使いやすければ雑でいいという話でもないわ。並んだ道具を見るのも、案外楽しいものよ。", "02", "4", "none")],
        },
        "daily:shelves:box": {
          lines: [line("待って、それは細かい部品の箱。傾けると混ざるのよ。見たいものがあるなら、私が出すわ。", "06", "3", "surprise")],
        },
        "daily:quiet": {
          lines: [line("作業中は、このくらいが丁度いいの。話し声より、鋏の切れ味が変わった音の方が気になるわね。", "01", "4", "none")],
          choices: [
            choice("音楽はかけないの？", "daily:quiet:music", 0),
            choice("一人だと寂しくない？", "daily:quiet:company", 0),
          ],
        },
        "daily:quiet:music": {
          lines: [line("単純な作業なら、かけることもあるわ。拍子につられて縫う速さが変わるのは、少し困るけれど。", "07", "2", "music")],
        },
        "daily:quiet:company": {
          lines: [line("一人で出来ることと、人に見てもらうことは別よ。今はあなたがいるし、わざわざ寂しくなる暇もないわ。", "02", "1", "none")],
        },
        "daily:break": {
          lines: [line("お茶を淹れたり、窓を開けたり。考えが行き詰まった時ほど、作業台から離れるようにしているの。", "04", "4", "none")],
          choices: [
            choice("お茶の支度を手伝おうか", "daily:break:tea", 2),
            choice("離れている間に思いつく？", "daily:break:idea", 1),
          ],
        },
        "daily:break:tea": {
          lines: [],
          affinityLines: [
            line("気持ちだけで十分よ。棚に壊れやすいものもあるから、今日は座っていて。お茶はすぐ淹れられるわ。", "01", "3", "none"),
            line("じゃあ、こちらのカップを二つ運んでもらえる？ 熱いお湯は私が持つから、机の方をお願い。", "02", "5", "none"),
            line("助かるわ。お茶の場所は、もう覚えたでしょう？ あなたが淹れている間に、お菓子を出しておくわね。", "02", "1", "none"),
            line("ええ、いつものようにお願い。今日は少し薄めにしてね。細かなことを言わなくて済むのは、気が楽だわ。", "07", "2", "none"),
          ],
        },
        "daily:break:idea": {
          lines: [line("思いつくこともあるし、何も浮かばないこともあるわ。でも、間違ったまま縫い進めるよりはいいでしょう。", "01", "4", "none")],
        },
        outing: {
          lines: [line("出かけるなら、帰りに荷物が増える分も考えておかないと。今日はどこを見て回るつもりなの？", "01", "3", "question")],
          choices: [
            choice("里の店を見たい", "outing:town", 0),
            choice("森を歩いてみたい", "outing:forest", 0),
            choice("お祭りの準備を見たい", "outing:festival", 1),
          ],
        },
        "outing:town": {
          lines: [line("それなら糸を少し買い足したいわ。同じ白でも違うから、窓際で見せてもらえる店がいいの。", "02", "4", "none")],
          choices: [
            choice("糸選びを手伝ってみたい", "outing:town:choose", 2),
            choice("綺麗な布も買う？", "outing:town:cloth", 0),
          ],
        },
        "outing:town:choose": {
          lines: [],
          affinityLines: [
            line("まずは見ていて。見本を糸に重ねると、色の違いが判りやすいの。慣れたら、あなたにも選んでもらうわ。", "01", "4", "none"),
            line("この見本に近いものを二つ選んでみて。最後は私が確かめるから、間違いを気にしなくていいわ。", "02", "5", "none"),
            line("あなたなら少し違う色を選びそうね。見本通りの分は私が買うから、もう一色は任せてみようかしら。", "07", "2", "none"),
            line("ええ、今回はあなたの選んだ色を使ってみるわ。どう仕上げるかまで、一緒に考えてもらうつもりだけど。", "02", "1", "none"),
          ],
        },
        "outing:town:cloth": {
          lines: [line("使い道が思いつけばね。綺麗だからと全部買っていたら、布をしまうための家がもう一軒必要になるわ。", "07", "2", "none")],
        },
        "outing:forest": {
          lines: [line("道を外れなければ、少し付き合えるわ。足元だけ見ていると枝にぶつかるから、顔も上げて歩いてね。", "03", "3", "none")],
          choices: [
            choice("何か拾って帰りたい", "outing:forest:collect", 0),
            choice("道を覚えるこつは？", "outing:forest:path", 1),
          ],
        },
        "outing:forest:collect": {
          lines: [line("落ちた枝なら、形の面白いものがあるかもしれないわね。知らない茸まで拾わないでよ。鑑定は出来ないから。", "04", "4", "sweat")],
        },
        "outing:forest:path": {
          lines: [line("目印は、帰る向きからも見ておくの。一方からしか判らない木を覚えても、帰りに迷うでしょう？", "01", "5", "idea")],
        },
        "outing:festival": {
          lines: [line("準備を見るなら、荷物の通り道は空けてね。まだ幕を張っているところだから、完成した舞台とは違うわよ。", "01", "5", "none")],
          choices: [
            choice("人形の出番を見たい", "outing:festival:dolls", 1),
            choice("準備も手伝える？", "outing:festival:help", 2),
          ],
        },
        "outing:festival:dolls": {
          lines: [line("今なら立ち位置の確認くらいね。本番の仕掛けは、始まってからのお楽しみ。全部見せたらつまらないでしょう。", "07", "2", "none")],
        },
        "outing:festival:help": {
          lines: [line("それなら客席の端から見て、幕の陰が見えないか教えて。舞台の上にいると、確かめられないのよ。", "02", "5", "none")],
        },
        danmaku: {
          lines: [line("人形が多ければ強い、というわけではないの。どこに置いて、いつ動かすか。気になるのはどの辺り？", "03", "4", "none")],
          choices: [
            choice("人形の配置を知りたい", "danmaku:formation", 1),
            choice("避け方を教えて", "danmaku:dodge", 0),
            choice("練習を見てみたい", "danmaku:practice", 1),
          ],
        },
        "danmaku:formation": {
          lines: [line("まず、相手に見せる人形と、後で働かせる人形を分けるの。全部を一度に動かす必要はないわ。", "01", "5", "none")],
          choices: [
            choice("目立つ方はおとり？", "danmaku:formation:decoy", 1),
            choice("離れた人形も見ているの？", "danmaku:formation:watch", 1),
          ],
        },
        "danmaku:formation:decoy": {
          lines: [line("そう決めつけたら、その人形に撃たれるわよ。気を引く役でも、見逃していい相手とは限らないでしょう。", "07", "2", "none")],
        },
        "danmaku:formation:watch": {
          lines: [line("一体ずつ目で追っていたら間に合わないわ。置いた位置を覚えて、動いた後に全体の形を確かめるの。", "03", "4", "none")],
        },
        "danmaku:dodge": {
          lines: [line("飛んできた弾だけでなく、次に撃ちそうな人形も見て。狭くなってから出口を探すのでは遅いわ。", "03", "5", "none")],
          choices: [
            choice("じっと待つのも大事？", "danmaku:dodge:wait", 1),
            choice("目が追いつかなくなったら？", "danmaku:dodge:lost", 0),
          ],
        },
        "danmaku:dodge:wait": {
          lines: [line("ええ、無駄に動かなければ、弾の流れも読みやすいわ。待つのと、動けずにいるのは違うけれどね。", "02", "1", "none")],
        },
        "danmaku:dodge:lost": {
          lines: [line("全部見ようとしなくていいの。まず近い弾と、抜ける場所を一つ。余裕が出来たら、見る範囲を広げて。", "04", "3", "none")],
        },
        "danmaku:practice": {
          lines: [line("見るだけなら、そこの線より後ろにいて。配置を試している途中だから、途中で声をかけるのは控えてね。", "03", "3", "none")],
          choices: [
            choice("動かし直すのは失敗した時？", "danmaku:practice:retry", 0),
            choice("練習の相手になれる？", "danmaku:practice:join", 2),
          ],
        },
        "danmaku:practice:retry": {
          lines: [line("失敗だけではないわ。上手くいった理由も、もう一度確かめるの。たまたま出来たことは、当てに出来ないもの。", "01", "4", "none")],
        },
        "danmaku:practice:join": {
          lines: [],
          affinityLines: [
            line("今日は見学だけにしておきましょう。あなたがどのくらい動けるのか、まだ判らないままでは始められないわ。", "03", "3", "none"),
            line("それなら弾を出さずに、二体の間を通ってみて。速さを合わせるところからよ。急いでも練習にならないわ。", "01", "5", "none"),
            line("この間の速さから始めましょう。狭いと感じたところを、後で教えてね。相手の見え方も知っておきたいの。", "02", "1", "none"),
            line("ええ、今日は配置を一つ変えてあるわ。前と同じようには抜けられないはず。あなたなら、気づくでしょうけど。", "07", "2", "none"),
          ],
        },
      },
    },
    marisa: {
      topics: [
        { id: "daily", label: "魔理沙の普段", entry: "daily" },
        { id: "outing", label: "ひとっ飛び", entry: "outing" },
        { id: "danmaku", label: "火力の相談", entry: "danmaku" },
      ],
      nodes: {
        daily: {
          lines: [line("ちょうど一仕事終わったところだ。片づけはまだだけどな。そっちは何を聞きに来たんだ？", "02", "3", "none")],
          choices: [
            choice("集めた物はどうしてる？", "daily:collection", 1),
            choice("実験はうまくいった？", "daily:experiment", 1),
            choice("夜遅くまで起きてるの？", "daily:night", 0),
          ],
        },
        "daily:collection": {
          lines: [line("使えそうな物と、そのうち使えそうな物に分けてる。違いが判らない？ 私にも時々判らなくなるぜ。", "07", "5", "sweat")],
          choices: [
            choice("整理を手伝ってもいい？", "daily:collection:help", 2),
            choice("使い道のない物は捨てる？", "daily:collection:keep", 0),
          ],
        },
        "daily:collection:help": {
          lines: [],
          affinityLines: [
            line("まずはそこを踏まないで待っててくれ。片づけるつもりで触って、余計に仕事を増やした客がいるんでな。", "03", "2", "none"),
            line("じゃあ、空の瓶だけ集めてくれ。中に何か残っていたら別にしておけよ。匂いで確かめる必要はないぞ。", "01", "3", "none"),
            line("お、助かるぜ。いつもの分け方で頼む。私が取っておきそうな物は、もう大体判るようになっただろ？", "02", "1", "none"),
            line("あの箱は任せた。捨てるか迷ったら、お前の方で取っておいてくれ。後で私が欲しがるかもしれないしな。", "07", "4", "none"),
          ],
        },
        "daily:collection:keep": {
          lines: [line("今はなくても、後で思いつくかもしれないだろ。……置く場所？ それも後で思いつけば、丸く収まるな。", "07", "2", "none")],
        },
        "daily:experiment": {
          lines: [line("狙った色は出た。でも思ったより煙が多くてな。成功かどうかは、窓を開けてから考えてたところだ。", "04", "4", "sweat")],
          choices: [
            choice("何を変えて試したの？", "daily:experiment:change", 1),
            choice("失敗した時はどうする？", "daily:experiment:fail", 1),
          ],
        },
        "daily:experiment:change": {
          lines: [line("今日は量だけだ。いくつも変えたら、何が効いたのか判らなくなる。派手な結果にも地味な下準備があるんだぜ。", "03", "1", "none")],
        },
        "daily:experiment:fail": {
          lines: [line("起きたことを先に書く。何も残さず片づけると、同じ失敗をもう一回やる羽目になるからな。笑うのは後だ。", "01", "3", "none")],
        },
        "daily:night": {
          lines: [line("気になる所があると、切り上げ時を逃すんだよ。あと一頁のつもりが、朝まで増え続けることもある。", "08", "3", "sigh")],
          choices: [
            choice("眠くならないの？", "daily:night:sleep", 0),
            choice("続きが気になる本なんだね", "daily:night:book", 1),
          ],
        },
        "daily:night:sleep": {
          lines: [line("なるに決まってるだろ。字を同じ所で読み直し始めたら寝る。そこで粘っても、翌日また読むだけだしな。", "07", "2", "none")],
        },
        "daily:night:book": {
          lines: [line("面白いのもあるが、納得がいかないのもある。結論だけ書いて、途中を省かれると余計に気になるんだよな。", "03", "4", "none")],
        },
        outing: {
          lines: [line("外へ出るなら、今からでもいいぜ。行き先は決めたか？ 飛び出してから相談すると、声が聞こえなくなるぞ。", "02", "4", "none")],
          choices: [
            choice("森で何か探したい", "outing:forest", 1),
            choice("里を見て回りたい", "outing:town", 0),
            choice("高い所から景色が見たい", "outing:sky", 0),
          ],
        },
        "outing:forest": {
          lines: [line("探す物を決めすぎない方が面白い時もあるな。今日は空の袋を一つ持っていくか。大きすぎないやつを。", "07", "2", "none")],
          choices: [
            choice("その袋で足りる？", "outing:forest:bag", 0),
            choice("何を見つけたら呼べばいい？", "outing:forest:find", 1),
          ],
        },
        "outing:forest:bag": {
          lines: [line("足りなくなったら、何を持ち帰るか考えるんだよ。最初から大きいのを持つと、帰りだけ遅くなるからな。", "01", "3", "none")],
        },
        "outing:forest:find": {
          lines: [line("変わった形の枝でも、見慣れない石でもいい。触る前に呼んでくれ。妙な物ほど、先に眺めた方が面白いぜ。", "02", "5", "idea")],
        },
        "outing:town": {
          lines: [line("寄り道の時間はあるか？ 用が一つでも、気になる店があると覗きたくなるんだ。急ぎなら先に言ってくれ。", "01", "3", "none")],
          choices: [
            choice("どんな物に足が止まるの？", "outing:town:window", 1),
            choice("買い物の荷物を持とうか", "outing:town:carry", 2),
          ],
        },
        "outing:town:window": {
          lines: [line("何に使うのか判らない道具かな。説明を聞いて普通の物だったら、それはそれで、よく考えた形だと感心する。", "07", "4", "none")],
        },
        "outing:town:carry": {
          lines: [],
          affinityLines: [
            line("まだ何も買ってないんだから、気が早いな。持ちきれなくなった時に頼むよ。まずは身軽に見て回ろうぜ。", "02", "3", "none"),
            line("助かる。買ったら、割れない方を頼むよ。重かったら途中で言ってくれ。意地を張るような勝負じゃないしな。", "01", "5", "none"),
            line("じゃあ、帰りは半分ずつだな。いつも私が寄り道するから、今日はお前の行きたい店にも寄っていこうぜ。", "02", "1", "none"),
            line("おう、頼んだ。代わりに、お前が変な物を買った時は私が持つよ。そういう荷物なら話の種にもなるしな。", "07", "4", "none"),
          ],
        },
        "outing:sky": {
          lines: [line("景色を見るなら、速さは要らないな。風が穏やかな所で止まってみよう。上からだと道の形がよく判るぜ。", "02", "5", "none")],
          choices: [
            choice("いつもは速く飛ぶの？", "outing:sky:speed", 0),
            choice("夕方まで眺めていたい", "outing:sky:sunset", 0),
          ],
        },
        "outing:sky:speed": {
          lines: [line("急ぐ用ならな。ただ飛ばすのと、思った所に止まれるのは別だ。速く飛べても、行き先を通り過ぎたら格好がつかない。", "07", "2", "none")],
        },
        "outing:sky:sunset": {
          lines: [line("それなら羽織る物を一枚持ってこいよ。日が落ちると冷える。景色に見とれて、帰りに震えるのも間抜けだろ。", "01", "3", "none")],
        },
        danmaku: {
          lines: [line("弾幕の相談か。派手に撃つ話なら歓迎だぜ。速さと火力と避け方、今日はどこから聞きたい？", "07", "1", "none")],
          choices: [
            choice("火力を上げたい", "danmaku:power", 1),
            choice("速く動けるようになりたい", "danmaku:speed", 0),
            choice("避ける練習をしたい", "danmaku:practice", 1),
          ],
        },
        "danmaku:power": {
          lines: [line("威力を上げる前に、狙った所に届いてるか見ようぜ。盛大に外したら、空が明るくなるだけだからな。", "03", "4", "none")],
          choices: [
            choice("大きい弾なら当てやすい？", "danmaku:power:large", 0),
            choice("撃つ時機も大事？", "danmaku:power:timing", 1),
          ],
        },
        "danmaku:power:large": {
          lines: [line("避ける方にもよく見えるだろ？ 大きさだけで済むなら苦労しないさ。小さいのを混ぜる理由も、ちゃんとあるんだぜ。", "07", "2", "none")],
        },
        "danmaku:power:timing": {
          lines: [line("おう。相手が動く前か、動いた先か。それが噛み合った一発は気分がいい。撃ちっぱなしとは違う手応えだな。", "02", "1", "none")],
        },
        "danmaku:speed": {
          lines: [line("まずは短い距離で、止まる場所を決めるんだ。行きすぎて戻る癖がつくと、弾に二回近づくことになるぞ。", "03", "3", "none")],
          choices: [
            choice("小さく動くのは苦手そう", "danmaku:speed:small", 0),
            choice("いつ速さを使えばいい？", "danmaku:speed:when", 1),
          ],
        },
        "danmaku:speed:small": {
          lines: [line("おいおい、失礼だな。大きく動くために、小さく避ける時もあるんだよ。いつも全速力じゃ、箒の置き場にも困るぜ。", "05", "2", "anger")],
        },
        "danmaku:speed:when": {
          lines: [line("遠くの空いた場所へ移る時だな。近くの隙間まで勢いよく飛び込むと、抜けた先の弾が待ってたりする。", "01", "5", "none")],
        },
        "danmaku:practice": {
          lines: [line("練習なら、最初は少なく撃つぞ。避けられた理由が判らないまま量だけ増やしても、忙しくなるだけだ。", "03", "4", "none")],
          choices: [
            choice("一回避けられたら次へ進む？", "danmaku:practice:repeat", 0),
            choice("見てもらいながら試したい", "danmaku:practice:together", 2),
          ],
        },
        "danmaku:practice:repeat": {
          lines: [line("もう一回やろうぜ。二回目も同じように抜けたら、少し変える。たまたま助かったのと、避けたのは分けないとな。", "02", "1", "none")],
        },
        "danmaku:practice:together": {
          lines: [],
          affinityLines: [
            line("まずは弾なしで動いてみてくれ。どこで止まれるか判ってから撃つよ。いきなり派手にやる場面じゃないからな。", "03", "3", "none"),
            line("いいぜ。最初は同じ方から撃つ。慌てて動き始めたら、そこで一度止めよう。失敗した所から覚えればいいさ。", "01", "4", "none"),
            line("おう、前に引っかかった所からやってみるか。抜けられたら、次は少し速くする。付き合うから焦らずやろうぜ。", "02", "1", "none"),
            line("任せろ。今度は途中で撃ち方を変えるぞ。お前なら気づけるはずだし、私も同じことばかりじゃ退屈だからな。", "07", "5", "none"),
          ],
        },
      },
    },
    patchouli: {
      topics: [
        { id: "daily", label: "書斎の話", entry: "daily" },
        { id: "outing", label: "外の空気", entry: "outing" },
        { id: "danmaku", label: "魔法の組み方", entry: "danmaku" },
      ],
      nodes: {
        daily: {
          lines: [line("今は区切りのいいところ。話すなら聞くわ。ただし、本の山を動かす用事なら先にそう言って。", "01", "2", "none")],
          choices: [
            choice("読む本はどう選ぶの？", "daily:books", 1),
            choice("時間を忘れない？", "daily:time", 0),
            choice("読むのに疲れたら？", "daily:rest", 0),
          ],
        },
        "daily:books": {
          lines: [line("調べたい事から選ぶ時も、途中で見つけた一文から探す時もあるわ。予定通りに減る山ではないの。", "01", "4", "none")],
          choices: [
            choice("途中の本を忘れそう", "daily:books:unfinished", 0),
            choice("読む順番を決めてもらえる？", "daily:books:guide", 2),
          ],
        },
        "daily:books:unfinished": {
          lines: [line("栞に短く書いておくの。何頁かより、何を確かめたかったか。数字だけ残すと、続きを読んでも思い出せないから。", "03", "4", "none")],
        },
        "daily:books:guide": {
          lines: [],
          affinityLines: [
            line("まず、何をどこまで読んだか教えて。難しい本を渡して終わりでは、あなたも私も時間を無駄にするでしょう。", "01", "3", "none"),
            line("この二冊からね。同じ言葉の説明を読み比べてみて。判らない所は印をつけて。書き込みではなく、紙を挟むのよ。", "03", "2", "none"),
            line("前の本が読めたなら、こちらへ進んでいいわ。途中の計算は省かないで。そこを飛ばす癖、まだあるでしょう。", "02", "3", "none"),
            line("あなた用に、順番はもう考えてあるわ。この束を上から。読み終わったら、今度はあなたの解釈を聞かせて。", "02", "1", "none"),
          ],
        },
        "daily:time": {
          lines: [line("忘れることはあるわ。お茶が冷たくなって気づく。時計が悪いわけではないから、文句の言い先もないのよね。", "04", "5", "sigh")],
          choices: [
            choice("誰かに声をかけてもらう？", "daily:time:reminder", 0),
            choice("冷めたお茶はどうする？", "daily:time:tea", 0),
          ],
        },
        "daily:time:reminder": {
          lines: [line("声をかけられても、あと一段落と答えるでしょうね。覚えるべきなのは時刻より、そこで本を閉じる方かもしれない。", "07", "2", "none")],
        },
        "daily:time:tea": {
          lines: [line("普通に飲むわよ。お茶の温度を戻すために、毎回魔法を組むと思った？ その間に一頁は読めるわ。", "07", "5", "none")],
        },
        "daily:rest": {
          lines: [line("目を閉じるか、別の事を考えるか。別の本を開くのは、休憩には入れない方がいいと最近思っているわ。", "08", "2", "none")],
          choices: [
            choice("音楽を聴くのは？", "daily:rest:music", 1),
            choice("何も考えない時間はある？", "daily:rest:empty", 0),
          ],
        },
        "daily:rest:music": {
          lines: [line("悪くないわ。知らない曲だと、次の音を追ってしまうけれど。休む時は、聴き慣れたものの方が落ち着くわね。", "02", "1", "music")],
        },
        "daily:rest:empty": {
          lines: [line("何も考えていないか、確かめ始めた時点で失敗ね。出来たら出来たで、覚えていないでしょうし。困った質問だわ。", "07", "5", "question")],
        },
        outing: {
          lines: [line("外に出る話？ 行き先と用事を先に聞くわ。散歩にも理由が要るとは言わないけれど、支度は変わるもの。", "01", "3", "none")],
          choices: [
            choice("庭で少し休まない？", "outing:garden", 1),
            choice("里の店を見てみたい", "outing:town", 0),
            choice("ここで窓を開けるだけでも", "outing:window", 1),
          ],
        },
        "outing:garden": {
          lines: [line("短い時間ならね。本は一冊にしておくわ。何も持たずに行くと、結局読みたい所を思い出しそうだから。", "02", "2", "none")],
          choices: [
            choice("それで休めるの？", "outing:garden:rest", 0),
            choice("持っていく物を用意しようか", "outing:garden:prepare", 2),
          ],
        },
        "outing:garden:rest": {
          lines: [line("持っていくだけで、読むとは限らないわ。……そこを疑うのね。じゃあ、最初のお茶が冷めるまでは閉じておく。", "04", "5", "sweat")],
        },
        "outing:garden:prepare": {
          lines: [],
          affinityLines: [
            line("ありがとう。でも場所を説明するより、自分で出す方が早いわ。先に、庭のどこで休むか見てきてもらえる？", "01", "2", "none"),
            line("そこの上着をお願い。本の上に重ねず、腕に掛けて持って。支度に時間をかけるほど遠くへは行かないわ。", "02", "3", "none"),
            line("いつもの上着でいいわ。何を持っていくか、もう聞かなくても判るのね。それなら私も少し手を抜ける。", "02", "1", "none"),
            line("ええ、任せるわ。本まで用意しなくていいからね。今日はあなたが何を見つけたか、聞きながら休むことにする。", "07", "5", "none"),
          ],
        },
        "outing:town": {
          lines: [line("店を決めてから行きたいわね。歩き回った末に、必要なものを買い忘れるのは避けたいもの。何を見るつもり？", "03", "3", "none")],
          choices: [
            choice("紙や筆記具を見たい", "outing:town:paper", 1),
            choice("行ってから決めたい", "outing:town:wander", 0),
          ],
        },
        "outing:town:paper": {
          lines: [line("なら、書いた裏まで見せてもらいましょう。表の白さより、墨がどう染みるかの方が気になるわ。", "01", "4", "none")],
        },
        "outing:town:wander": {
          lines: [line("そういう出かけ方もあるのね。それなら、帰る時刻だけは決めておきましょう。予定が一つもないと落ち着かないわ。", "04", "2", "none")],
        },
        "outing:window": {
          lines: [line("ええ、その方が手軽ね。ただ、先に机の紙を押さえて。空気を入れ替えて、頁の順番まで変えたくはないから。", "01", "3", "none")],
          choices: [
            choice("風が入ると気持ちいいね", "outing:window:breeze", 0),
            choice("窓辺に椅子を移す？", "outing:window:chair", 1),
          ],
        },
        "outing:window:breeze": {
          lines: [line("部屋の匂いも、離れないと判らなくなるのね。少し開けておきましょう。雨の匂いがしたら、教えて。", "02", "5", "none")],
        },
        "outing:window:chair": {
          lines: [line("眩しくない側なら。椅子だけにしてね。机まで動かすと、散歩より大がかりな仕事になってしまうわ。", "07", "2", "none")],
        },
        danmaku: {
          lines: [line("魔法の組み方を知りたいのね。属性の相性か、弾の配置か、それとも自分で試したい？ 順に話すより早いわ。", "03", "3", "none")],
          choices: [
            choice("属性の選び方を知りたい", "danmaku:elements", 1),
            choice("弾はどう配置するの？", "danmaku:pattern", 1),
            choice("簡単な練習をしたい", "danmaku:practice", 1),
          ],
        },
        "danmaku:elements": {
          lines: [line("何を起こしたいかが先よ。同じ場所へ届かせるだけでも、速さや広がり方が違う。名前だけで選ばないこと。", "01", "3", "none")],
          choices: [
            choice("強い属性を選べばいい？", "danmaku:elements:strong", 0),
            choice("二つ合わせると得なの？", "danmaku:elements:combine", 1),
          ],
        },
        "danmaku:elements:strong": {
          lines: [line("いつでも強いものが一つあるなら、こんなに本は要らないわ。得意な条件と、扱いにくい条件を一緒に覚えて。", "07", "2", "none")],
        },
        "danmaku:elements:combine": {
          lines: [line("互いを助ける組み方ならね。合わせたせいで打ち消し合うこともあるわ。数を増やすだけでは、手間が増えるだけ。", "03", "2", "none")],
        },
        "danmaku:pattern": {
          lines: [line("同時に見せたい形と、時間を置いて見せたい形を分けるの。紙に描いた模様だけでは、動きまでは判らないわ。", "01", "3", "none")],
          choices: [
            choice("綺麗な形を先に考える？", "danmaku:pattern:shape", 0),
            choice("計算どおりに飛ばなかったら？", "danmaku:pattern:wrong", 1),
          ],
        },
        "danmaku:pattern:shape": {
          lines: [line("それも一つの始め方ね。ただ、綺麗に止まった図を作るのと、弾幕として見せるのは違う。見る位置も変わるでしょう。", "02", "5", "none")],
        },
        "danmaku:pattern:wrong": {
          lines: [line("計算か、前提か、手順か。違いが出た所から戻るわ。期待どおりでないからと、結果の方を無かったことには出来ないもの。", "03", "3", "none")],
        },
        "danmaku:practice": {
          lines: [line("まず、同じ間隔で並ぶ弾を観察しましょう。撃ち始めから消えるまで見て。途中だけ見て判ったつもりにならないで。", "03", "3", "none")],
          choices: [
            choice("見るだけでも練習になる？", "danmaku:practice:observe", 0),
            choice("気づいた事を聞いてほしい", "danmaku:practice:report", 2),
          ],
        },
        "danmaku:practice:observe": {
          lines: [line("次にどこへ来るか予想して、確かめてみて。ただ眺めるのとは違うわ。外れた時こそ、よく見直せるでしょう。", "01", "3", "idea")],
        },
        "danmaku:practice:report": {
          lines: [],
          affinityLines: [
            line("ええ、短くてもいいから話してみて。正しい答えを当てるための問題ではないわ。何を見たのかが知りたいの。", "01", "3", "none"),
            line("聞かせて。前より、見る場所が絞れているといいわね。間違っていても、理由があれば次に試すことは決まるから。", "02", "3", "none"),
            line("あなたが気づいた所から話して。私の説明を繰り返さなくていいわ。別の見方があれば、こちらも確かめられるもの。", "02", "1", "none"),
            line("では、今日はあなたの説明から始めましょう。疑問があれば私も聞くわ。聞く側を替えると、抜けた所が判るのよ。", "07", "2", "none"),
          ],
        },
      },
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
