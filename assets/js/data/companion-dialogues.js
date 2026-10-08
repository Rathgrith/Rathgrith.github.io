/* The preceding revision’s Japanese conversations, preserved verbatim. */
(function (root) {
  "use strict";
  function line(ja, expression, pose) {
    return {
      text: ja,
      expressionMotionId: expression || "01",
      poseId: pose || "1",
    };
  }
  var characters = {
    alice: {
      name: "アリス",
      fullName: "アリス・マーガトロイド",
      location: "魔法の森 · 人形工房",
      scene: "alice-atelier.png",
      greetings: [
        line(
          "あら、お客さん？ 糸に足を引っかけないように。用事があるなら、そこで聞くわ。"
        ),
        line(
          "また来たのね。ちょうど針を置いたところよ。少しなら、お茶に付き合えるわ。",
          "02"
        ),
        line(
          "その椅子、空けておいたわ。前に話した人形の続き、見ていくでしょう？",
          "02"
        ),
        line(
          "足音で判ったわ。……驚くこと？ 何度も来る人の歩き方くらい、覚えるものよ。",
          "07"
        ),
      ],
      craft: [
        line(
          "同じ型紙でも、縫い目ひとつで表情が変わるの。そこが面白くて、難しいところね。",
          "07"
        ),
        line("この子のリボン、どう思う？ 意見だけなら聞いてあげる。", "01"),
      ],
      choices: [
        {
          label: "縫い目を見てみる",
          delta: 2,
          responses: [
            line("目の付け所は悪くないわね。でも、針には触らないこと。"),
            line(
              "そこに気づいたの？ 裏側も見せてあげる。こちらの方が手間なのよ。",
              "02"
            ),
            line(
              "そう、その一針。見えないところまで見てくれると、作り甲斐があるわ。",
              "02"
            ),
            line(
              "あなたなら気づくと思っていたわ。次の一体は、最初の型紙から見せてあげる。",
              "07"
            ),
          ],
        },
        {
          label: "人形の演技が見たい",
          delta: 1,
          responses: [
            line("見世物なら、今度のお祭りで。まだ調整が済んでいないの。"),
            line(
              "一曲だけよ。拍手は人形にしてあげて。……動かしているのは私だけど。",
              "02"
            ),
            line(
              "では、特等席へどうぞ。失敗したところは、後でこっそり教えてね。",
              "02"
            ),
            line(
              "今日は、あなたを観客にした演目にしましょう。ふふ、途中で帰るのはなしよ。",
              "07"
            ),
          ],
        },
      ],
      rest: [
        line(
          "細かい仕事ほど、休む時間が要るの。糸を張り続ければ、いつか切れるでしょう。"
        ),
        line("お茶が冷めるまで、手を止めていなさい。人形も、今は休憩。", "02"),
      ],
      weather: {
        wet: line(
          "森の湿気で糸の具合が変わるの。外へ出るなら、帰り道の目印を忘れずに。"
        ),
        snow: line(
          "雪の日は、窓際の人形にも上着が欲しくなるわね。必要はないのだけれど。",
          "07"
        ),
        clear: line("いい光ね。布の色を見るなら、今がちょうどいいわ。", "02"),
        unknown: line(
          "窓の外を見てくる？ 空模様が判るまでは、急いで出かけなくてもいいでしょう。"
        ),
      },
      morning: line(
        "朝のうちに、細かい縫い物を済ませたいの。明るいと糸の色もよく判るから。"
      ),
      night: line(
        "もうこんな時間。あと一針……と言っていると、朝になるのよね。",
        "07"
      ),
      seasons: [
        line(
          "森の花が増えてきたわ。今年は、どの色を衣装に取り入れようかしら。"
        ),
        line("夏の布は軽いものがいいわね。人形の衣装にも、季節はあるのよ。"),
        line(
          "落ち葉の色は毎日少しずつ違うの。覚えておくと、染め物の参考になるわ。"
        ),
        line("今日は厚い布を出してきたの。触ってみる？ 手が少し温まるわよ。"),
      ],
      holidays: {
        newyear: line(
          "明けましておめでとう。今年の最初の一体は、丁寧に仕上げたいわね。焦らずに。",
          "02"
        ),
        valentine: line(
          "この包み？ お茶に合うお菓子よ。リボンは返さなくていいわ。結び方、覚えておいて。",
          "07"
        ),
        hinamatsuri: line(
          "今日は人形を飾る日ね。眺めるだけの人形にも、ちゃんと役目があるのよ。",
          "02"
        ),
        tanabata: line(
          "願い事を糸に結ぶ、というのは悪くないわね。叶えるための手は、自分で動かすけれど。"
        ),
        halloween: line(
          "仮装なら任せて。ただし、人形の衣装をそのまま借りようとしないでね。",
          "02"
        ),
        christmas: line(
          "窓辺の飾り、もう少し右かしら。……あなたからは、どう見える？",
          "07"
        ),
        yearend: line(
          "針の数も、糸の残りも確かめたわ。来年も、作りかけの続きを見に来て。",
          "02"
        ),
      },
    },
    marisa: {
      name: "魔理沙",
      fullName: "霧雨魔理沙",
      location: "魔法の森 · 霧雨魔法店",
      scene: "marisa-workshop.png",
      greetings: [
        line(
          "お、客か？ 足元に気をつけろよ。その瓶は、まだ何が起きるか判らないんだ。",
          "02"
        ),
        line("よく来たな。今日は煙も出てないし、まあ座っていけよ。", "02"),
        line(
          "ちょうどいいところに来たぜ。新しい実験、最初の観客になるか？",
          "07",
          "4"
        ),
        line(
          "お前の分の茶もあるぜ。偶然だって？ 毎回そう言うのも、そろそろ苦しいな。",
          "02"
        ),
      ],
      craft: [
        line(
          "派手に光るのは一瞬だが、そこまで持っていくのが長いんだ。魔法もな。",
          "01"
        ),
        line(
          "今日は星の光を調べてる。記録係と観測係、どっちをやってみる？",
          "02"
        ),
      ],
      choices: [
        {
          label: "実験を記録する",
          delta: 2,
          responses: [
            line("じゃあ、この数字を頼む。読めない字で書くのだけは勘弁な。"),
            line(
              "お、判りやすいな。私のメモより？ そこは言わなくていいぜ。",
              "02"
            ),
            line(
              "失敗の方も書いてくれ。うまくいかなかった理由、後で一緒に探そうぜ。",
              "01"
            ),
            line(
              "このノート、半分くらいお前の字になったな。次の発見には、お前の名前も書いておくぜ。",
              "07"
            ),
          ],
        },
        {
          label: "一緒に星を観測する",
          delta: 1,
          responses: [
            line("眩しかったら目を閉じろよ。合図の前に覗き込むなって。"),
            line(
              "どうだ、綺麗だろ？ まだ弱いが、色は狙い通りだぜ。",
              "02",
              "4"
            ),
            line(
              "今の見えたか？ よし、もう一度だ。一人で喜ぶより、ずっといいな。",
              "02"
            ),
            line(
              "一番いい場所、空けておいたぜ。成功する瞬間くらい、隣で見ていてくれよ。",
              "07"
            ),
          ],
        },
      ],
      rest: [
        line(
          "煮詰まったら箒でひと回り……って手もあるが、今日は茶にしておこうか。",
          "02"
        ),
        line(
          "休んだって、今まで調べたことは逃げないぜ。眠い頭で計算すると、そっちの方が遠回りだ。"
        ),
      ],
      weather: {
        wet: line(
          "この空じゃ箒も濡れるな。仕方ない、今日は室内で出来る実験だ。小さいやつだけな。",
          "02"
        ),
        snow: line(
          "雪の上だと星の光がよく映えるんだ。寒さを忘れる……までは、いかないけどな。",
          "07"
        ),
        clear: line(
          "いい空だな。箒の調子も見ておきたいし、後で森をひと回りするか。",
          "02"
        ),
        unknown: line(
          "外の様子は、まだ判らないみたいだな。まあ、道具の手入れでもして待つか。"
        ),
      },
      morning: line(
        "朝から来るとは熱心だな。私は……今起きたんじゃないぜ。ちょっと考え事をしてたんだ。",
        "02"
      ),
      night: line(
        "星が出る時間だな。あと一つだけ試したいが……明日の自分にも仕事を残しておくか。",
        "07"
      ),
      seasons: [
        line("森も騒がしくなってきたな。新しい材料探しには、いい季節だぜ。"),
        line(
          "暑いな。瓶を窓際に置きっぱなしにしないように……おっと、今のは私の話だ。"
        ),
        line(
          "落ち葉の下には面白いものがあるんだ。拾う前に、よく確かめるけどな。"
        ),
        line("手が冷えると細かい作業が進まないな。茶を淹れる理由が増えたぜ。"),
      ],
      holidays: {
        newyear: line(
          "明けましておめでとう！ 今年も面白いもの、いっぱい見つけようぜ。",
          "02",
          "4"
        ),
        valentine: line(
          "お、菓子の日か。魔法の材料とは分けて置いてくれよ。私も一つ、取っておいたぜ。",
          "02"
        ),
        hinamatsuri: line(
          "人形の祭りか。アリスのところ、いつもより賑やかになってそうだな。"
        ),
        tanabata: line(
          "星に頼むのもいいが、箒で近づいてみたくなるな。……近づいた分、叶うわけじゃないか。",
          "02"
        ),
        halloween: line(
          "今日はこの格好で菓子がもらえるのか？ 普段着なんだが、便利な祭りだぜ。",
          "02",
          "4"
        ),
        christmas: line(
          "飾りの星が足りない？ 作ってやるぜ。今日は光るだけ、爆発しないやつな。",
          "07"
        ),
        yearend: line(
          "今年の失敗もノートに残しておくぜ。来年の成功の、下書きってことでな。",
          "02"
        ),
      },
    },
    patchouli: {
      name: "パチュリー",
      fullName: "パチュリー・ノーレッジ",
      location: "紅魔館 · 大図書館",
      scene: "patchouli-library.png",
      greetings: [
        line("……何か用？ 読みかけのところなの。質問なら、短くまとめて。"),
        line("来たのね。その机なら使っていいわ。本の置き場所は、変えないで。"),
        line(
          "前の質問に関係する本を、脇に置いておいたわ。続きを考えてみましょう。",
          "02"
        ),
        line(
          "今日は静かね。……あなたがいるのに、という意味ではないわ。この静けさなら、嫌いじゃない。",
          "07"
        ),
      ],
      craft: [
        line(
          "一冊に書かれていることだけで、結論を出すのは早いわ。別の記録と照らし合わせないと。",
          "03"
        ),
        line(
          "同じ術式の説明が、二通りあるの。あなたなら、どこから読み始める？"
        ),
      ],
      choices: [
        {
          label: "二つの解釈を比べる",
          delta: 2,
          responses: [
            line(
              "では、前提の違いを探して。判らない単語を読み飛ばさないように。",
              "03"
            ),
            line(
              "そこに線を引いたのね。いいわ、次は反例がないか考えましょう。",
              "02"
            ),
            line(
              "あなたの読み方は、私とは少し違う。だから、話を聞く意味があるのよ。",
              "03"
            ),
            line(
              "その解釈は、余白に残しておきましょう。……私の本に書き込んでいい相手は、多くないのよ。",
              "07"
            ),
          ],
        },
        {
          label: "基礎から教えてほしい",
          delta: 1,
          responses: [
            line("急がないのはいいことね。まず、こちらの薄い本から。"),
            line(
              "知らないと認められるなら、まだ先へ進めるわ。最初の式を見て。",
              "03"
            ),
            line(
              "前より質問が具体的になったわね。理解が進んでいる証拠よ。",
              "02"
            ),
            line(
              "何度でも説明するわ。あなたが判ったふりをしないことは、知っているから。",
              "07"
            ),
          ],
        },
      ],
      rest: [
        line(
          "同じ行を三度読んでいたら、栞を挟む頃合いね。私にも、そういう時はあるわ。"
        ),
        line(
          "少し目を休めましょう。話をしなくても、ここにいて構わないわ。",
          "02"
        ),
      ],
      weather: {
        wet: line(
          "雨音は嫌いではないけれど、本に湿気は大敵ね。窓を閉めてくれる？"
        ),
        snow: line(
          "雪の結晶にも規則があるの。寒い外で調べる役は……別の誰かに任せたいわね。",
          "03"
        ),
        clear: line(
          "外は明るいようね。ここでは、紙が読めるだけの光があれば十分よ。"
        ),
        unknown: line(
          "観測値がないなら、判らないと言っておきましょう。推測と記録は、分けるべきよ。",
          "03"
        ),
      },
      morning: line(
        "朝？ 本を読んでいると、窓の色を見るまで気づかないことがあるわ。"
      ),
      night: line(
        "続きが気になるのは判るけれど、眠気で読み違えるより、明日に残した方がいいわ。"
      ),
      seasons: [
        line(
          "季節が変わると、同じ記述も違って見えるわ。観察は、読み直す理由にもなるの。"
        ),
        line(
          "今日は水の魔法の章を読んでいるわ。涼しくなるかは、別の問題だけれど。"
        ),
        line("読書の季節？ そう。私には、一年中そうだけれど。"),
        line("本を暖炉に近づけないでね。温めるなら、先にあなたの手を。"),
      ],
      holidays: {
        newyear: line(
          "新しい暦ね。読み終えた本より、まだ読んでいない本を数えてしまうわ。",
          "02"
        ),
        valentine: line(
          "甘いものは、読書の合間に。……紙に触る前に、手を拭くのを忘れないで。"
        ),
        hinamatsuri: line(
          "人形に厄を託す風習にも、調べる価値はあるわ。儀式には、土地ごとの差があるもの。",
          "03"
        ),
        tanabata: line(
          "星の伝承と、実際の星の動き。両方を並べて読むと、面白いわよ。",
          "03"
        ),
        halloween: line(
          "魔女の仮装？ 本物の魔法使いが仮装するなら、何になればいいのかしら。",
          "07"
        ),
        christmas: line(
          "図書館に飾りを増やすなら、火を使わないものにして。光の魔法なら、少し手伝うわ。",
          "02"
        ),
        yearend: line(
          "一年で答えの出なかった問いがある。それは、来年も読む理由になるわね。",
          "03"
        ),
      },
    },
  };
  var holidayNames = {
    newyear: "お正月",
    valentine: "バレンタイン",
    hinamatsuri: "雛祭り",
    tanabata: "七夕",
    halloween: "ハロウィン",
    christmas: "クリスマス",
    yearend: "大晦日",
  };
  function holiday(date) {
    var m = date.getMonth() + 1,
      d = date.getDate();
    if (m === 1 && d <= 3) return "newyear";
    if (m === 2 && d === 14) return "valentine";
    if (m === 3 && d === 3) return "hinamatsuri";
    if (m === 7 && d === 7) return "tanabata";
    if (m === 10 && d === 31) return "halloween";
    if (m === 12 && (d === 24 || d === 25)) return "christmas";
    if (m === 12 && d === 31) return "yearend";
    return "";
  }
  function tier(value) {
    return Math.min(
      3,
      Math.floor(Math.max(0, Math.min(100, Number(value) || 0)) / 25)
    );
  }
  function weatherKey(weather) {
    if (!weather || !weather.phase) return "unknown";
    if (["rain", "storm", "mist"].indexOf(weather.phase) >= 0) return "wet";
    return weather.phase === "snow" ? "snow" : "clear";
  }
  function story(id, topic, affinity, context) {
    var c = characters[id] || characters.alice,
      ctx = context || {},
      date = ctx.date || new Date(),
      level = tier(affinity),
      special = holiday(date);
    if (topic === "craft")
      return { lines: c.craft.slice(), choices: c.choices, label: "魔法の話" };
    if (topic === "rest")
      return {
        lines: c.rest.slice().concat(c.greetings[level]),
        label: "お茶の時間",
      };
    if (topic === "weather")
      return {
        lines: [c.weather[weatherKey(ctx.weather)]],
        label: "窓の向こう",
      };
    var seasonal = c.seasons[Math.floor(((date.getMonth() + 10) % 12) / 3)];
    var time =
      date.getHours() >= 21 || date.getHours() < 5
        ? c.night
        : date.getHours() < 11
          ? c.morning
          : seasonal;
    return {
      lines: [special ? c.holidays[special] : time, c.greetings[level]],
      label: special ? holidayNames[special] : "今日のこと",
      special: special,
    };
  }
  root.CompanionStories = {
    characters: characters,
    story: story,
    tier: tier,
    holiday: holiday,
    holidayNames: holidayNames,
    tierNames: ["初対面", "顔なじみ", "信頼", "内緒話"],
  };
})(typeof window !== "undefined" ? window : globalThis);
