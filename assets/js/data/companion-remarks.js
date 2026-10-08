/* Original fan-written remarks about a small, documented circle of acquaintances.
 * Roster rationale and voice references live in docs/companion-system.md.
 */
(function (root) {
  "use strict";
  var names = {
    reimu: "博麗霊夢",
    marisa: "霧雨魔理沙",
    alice: "アリス",
    patchouli: "パチュリー",
    sakuya: "十六夜咲夜",
    remilia: "レミリア",
    meiling: "紅美鈴",
    rinnosuke: "森近霖之助",
    nitori: "河城にとり",
    kosuzu: "本居小鈴",
    fairies: "光の三妖精",
  };
  function remark(id, text) {
    return { id: id, name: names[id], text: text };
  }
  var remarks = {
    alice: [
      remark(
        "marisa",
        "魔理沙なら、また何か集めているんじゃない？ あの家、物を増やす前に片づければいいのに。探し物の時間まで研究に数えているのかしら。"
      ),
      remark(
        "patchouli",
        "パチュリーとは同じ魔法使いでも、やり方が違うの。あちらは属性、私は人形。どちらが上かって？ それは、試してみないと判らないでしょう。"
      ),
      remark(
        "reimu",
        "霊夢ったら、説明を聞く前に動くんだから。あれで大抵どうにかなるのが、余計に困るのよね。少しはこっちの段取りも考えてほしいわ。"
      ),
      remark(
        "sakuya",
        "咲夜は手際がいいわね。時間を止めている間だって、片づけるのは自分でしょう？ だからって、戦う時までナイフを散らかさなくてもいいのに。"
      ),
      remark(
        "fairies",
        "あの三妖精？ 家に相談に来たことがあるわ。悪戯を隠しているつもりでも、すぐ顔に出るのよ。人形の方が、まだ上手に黙っていられるわね。"
      ),
    ],
    marisa: [
      remark(
        "reimu",
        "霊夢の所なら、茶でも飲みに行くか。異変の話をすると面倒そうな顔をするくせに、動き出すと早いんだよな。こっちも、うかうかしてられないぜ。"
      ),
      remark(
        "alice",
        "アリスは細かい所までうるさいぜ。だが、あの数の人形を動かす腕は大したもんだ。ま、魔法のやり方まで合わせる気はないけどな。"
      ),
      remark(
        "patchouli",
        "パチュリーの図書館は、何度行っても読みたい本が見つかるんだ。退屈しない場所だぜ。返す本？ ……今日は別の話をしようじゃないか。"
      ),
      remark(
        "sakuya",
        "咲夜には困るな。こっそり通ったつもりでも、いつの間にか先にいるんだぜ。時間を止めるのは、かくれんぼじゃ反則だろ。"
      ),
      remark(
        "remilia",
        "レミリアは話が大げさなんだよ。運命だの何だのってな。茶の時間くらい、もう少し気楽でもいいと思うんだが。"
      ),
      remark(
        "rinnosuke",
        "香霖は昔からああだぜ。道具の名前を聞いただけで、話がなかなか終わらない。八卦炉を見てもらう時は、ちゃんと聞くけどな。"
      ),
      remark(
        "nitori",
        "にとりの道具は面白いな。地底に行った時も世話になったぜ。次に頼むなら、取り分の話は先に済ませておこう。"
      ),
      remark(
        "kosuzu",
        "小鈴は見たこともない字をすらすら読むんだ。あれは便利だな。妖魔本まで気軽に開くのは、見てるこっちが落ち着かないぜ。"
      ),
    ],
    patchouli: [
      remark(
        "remilia",
        "レミィ？ 退屈すると、すぐ面白い話を欲しがるのよ。本を渡しても、今はそういう気分じゃないって。……注文の多い友人ね。"
      ),
      remark(
        "sakuya",
        "咲夜のお茶は助かるわ。冷める前に飲めばいいのだけれど、つい次の頁を読んでしまうのよね。"
      ),
      remark(
        "meiling",
        "美鈴には、もう少し本も読んでほしいわね。体を動かすのは得意でしょうけど、考える方まで筋肉に任せられても困るわ。"
      ),
      remark(
        "marisa",
        "魔理沙の『借りる』は信用していないわ。持ち出した本を返してから言うことね。読むだけなら、ここで読めばいいでしょう。"
      ),
      remark(
        "alice",
        "アリスは、あれだけの人形を別々に動かすのね。なかなか器用だわ。私なら、その手間で術式を一つ増やすけれど。"
      ),
    ],
  };
  root.CompanionRemarks = remarks;
})(typeof window !== "undefined" ? window : globalThis);
