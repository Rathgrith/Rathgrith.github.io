---
permalink: /
title: ""
excerpt: ""
author_profile: true
redirect_from: 
  - /about/
  - /about.html
---

{% if site.google_scholar_stats_use_cdn %}
{% assign gsDataBaseUrl = "https://cdn.jsdelivr.net/gh/" | append: site.repository | append: "@" %}
{% else %}
{% assign gsDataBaseUrl = "https://raw.githubusercontent.com/" | append: site.repository | append: "/" %}
{% endif %}
{% assign url = gsDataBaseUrl | append: "google-scholar-stats/gs_data_shieldsio.json" %}

<span class='anchor' id='about-me'></span>

# 🏄‍♀️ About Me
 - I am a MEng student studying Computer Engineering with some expertise in Software Development and Deep Learning. 
 - Currently, I am working under the supervision of [Prof. Jianbo Jiao](https://jianbojiao.com/). 
 - Before that, I have worked closely with [Dr. Erick Purwanto](https://www.researchgate.net/profile/Erick-Purwanto) and [Prof. Jie Zhang](https://scholar.google.com.hk/citations?user=NVdWSwoAAAAJ&hl=en) during my undergraduate study.
 - These experiences show that I have some research background in backdoor learning, visual representation learning, and medical image segmentation. 
 - Fluent in English, Mandarin, and Japanese (Learned through an unsupervised manner).

My recent research interest includes *robust machine learning* and *representation learning* (cross-modal).

> ΟΣΟΝ ΖΗΣ ΦΑΙΝΟΥ / ΜΗΔΕΝ ΟΛΩΣ ΣΥ / ΛΥΠΟΥ ΠΡΟΣ ΟΛΙ / ΓΟΝ ΕΣΤΙ ΤΟ ΖΗΝ / ΤΟ ΤΕΛΟΣ Ο ΧΡΟ / ΝΟΣ ΑΠΑΙΤΕΙ   ----ΣΕΙΚΙΛΟΣ ΕΥΤΕΡ

# 🔥 News
- *2023.12*: &nbsp;🎉🎉 Glad to join [MIx group](https://mix.jianbojiao.com/) as a research intern.
- *2023.08*: &nbsp;🎉🎉 Started my Master degree in [UIUC ECE](https://ece.illinois.edu/).
- *2023.07*: &nbsp;🎉🎉 Got my distinction bachelor degree at [University of Liverpool](https://www.liverpool.ac.uk/computer-science/) and [XJTLU](https://www.xjtlu.edu.cn/en/study/undergraduate/information-and-computing-science). 

# 📝 Publications 
<div class='paper-box'><div class='paper-box-image'><div><div class="badge">Under Review</div><img src='images\timerep3.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

What Time Tells Us? Time-Aware Representation Learning from Static Images, **Dongheng Lin<sup>*</sup>**, Han Hu<sup>*</sup>, Jianbo Jiao<sup>†</sup>
- A new paradigm to learn visual cues for timestamps leading to time-aware understanding. 
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">IJCNN 2024</div><img src='images\SPSSfigure.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

[SPSS: A Salience-based Poisoning Selection Strategy for Selecting Backdoor Attack Victims](https://ieeexplore.ieee.org/document/10650242), Zihan Lyu<sup>1</sup>, **Dongheng Lin<sup>1</sup>**, Jie Zhang<sup>†</sup>, Ruiming Zhang<sup>2</sup>
- Designed an algorithm uses Salience Metric to evaluate sample feature significance towards backdoor learning process.
- With its assistance, we managed to realize a more data-efficient backdoor attack to DNN models achieved the same attack success rate to vanilla backdoor attack with only **38.44%** of poisoned samples.
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><div class="badge">CyberC 2022 (IEEE)</div><img src='images\1698515502562.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">


[Conditional Metadata Embedding Data Preprocessing Method for Semantic Segmentation](https://ieeexplore.ieee.org/document/10090205)

Juntuo Wang<sup>1</sup>, Qiaochu Zhao<sup>1</sup>, **Dongheng Lin<sup>1</sup>**, Erick Purwanto<sup>†</sup>, Ka Lok Man<sup>2</sup>

- In this paper, we propose a conditional data preprocessing strategy, i.e., Conditional Metadata Embedding (CME) data preprocessing strategy. The CME data preprocessing method will embed conditional information to the training data, which can assist the model to better overcome the differences in the datasets and extract useful feature information in the images.  
</div>
</div>


# 🎖 Honors and Awards
- *2022.10* XJTLU 2022 Summer Undergraduate Research Fellowship Poster Group Winner 
- *2022.07* University Academic Excellence Award — Scholarship for top 5% students

<!-- - *2021.09* Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ornare aliquet ipsum, ac tempus justo dapibus sit amet.  -->

# 📖 Education
- *2023.08 - now*, MEng in Electrical and Computer Engineering, [University of Illinois, Urbana-Champaign](https://ece.illinois.edu/)
- *2019.09 - 2023.07*, BSc in Information and Computing Science, [Xi'an Jiaotong-Liverpool University](https://www.xjtlu.edu.cn/en/study/undergraduate/information-and-computing-science)
- *2019.09 - 2023.07*, BSc in Information and Computing Science, [University of Liverpool](https://www.liverpool.ac.uk/computer-science/)

<!-- # 💬 Invited Talks
- *2022.10*, XJTLU STUDENT SYMPOSIUM OF RESEARCH-LED LEARNING, 1st Prize -->

# 💻 Internships
- *2023.11 - Now*, Research Intern at [MiX group at UofB](https://mix.jianbojiao.com/), UK (Remote).
- *2021.06 - 2021.10*, Backend Developer Intern at [Pactera](https://en.pactera.com/), China.


# 🖨 University Projects & Homeworks

## 🔧Projects
<div class='paper-box'>
<div class='paper-box-image'>
<div><img src='images/recafter.png' alt="sym" width="100%"></div>
</div>
<div class='paper-box-text' markdown="1">
[**Arxiv Explorer**](https://github.com/Rathgrith/CS410Project): Developed an efficient paper recommendation system on a comprehensive dataset of all Arxiv papers (until Feb 2024). Utilized FAISS indexing and a co-authorship map to enhance recommendation results through authority/hub-based HITS reranking.
</div>
</div>

<div class='paper-box'>
<div class='paper-box-image'>
<div><img src='images/MapleJuice.jpg' alt="sym" width="100%"></div>
</div>
<div class='paper-box-text' markdown="1">
[**MapleJuice: A Lightweight Counterpart to Hadoop with SQL-like Query Support**](https://github.com/Rathgrith/ece428_mp4): Developed a distributed system inspired by GFS, with efficient gossip-style failure detection and a Bully-algorithm-based leader election process, achieving a 25% performance improvement over Hadoop in small clusters.
</div>
</div>

<div class='paper-box'>
<div class='paper-box-image'>
<div><img src='images/1698952628334.png' alt="sym" width="100%"></div>
</div>
<div class='paper-box-text' markdown="1">
[**StyleDiffuser: Cartoon-Style Image Creation with Diffusion Model and GAN Fusion**](/assets/FYP_Thesis.pdf): Introduced a novel fusion of GANs with a Stable Diffusion Model for cartoon-style image generation, significantly reducing the number of diffusion steps and simplifying the image generation process.
</div>
</div>

## 📎Homework
Apart from these projects, here are few interesting written homeworks to refer: [Homework Samples]({{ '/pdf-list/' | relative_url }}).






# 🎪 Miscellaneous

 - A typical [Otaku](https://en.wikipedia.org/wiki/Otaku). 

   - My favorite manga: [臨海センチメント (Nostalgic Ocean Landscape)](https://www.pixiv.net/artworks/37362275).

   - Favorite [Light Novel](https://en.wikipedia.org/wiki/Light_novel) (Single Episode): [『続・終物語』](https://ja.wikipedia.org/wiki/%E7%B6%9A%E3%83%BB%E7%B5%82%E7%89%A9%E8%AA%9E)

 - I also enjoy photography and music.


<div class='paper-box'><div class='paper-box-image'><div><img src='images/UIUCphoto/1.jpg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
 - FUJICHROME Velvia 100, taken at my hometown.
</div>
</div>




<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width="100%" height="auto" src="//music.163.com/outchain/player?type=2&id=732185&auto=0&height=66"></iframe>

## ✍Erdős Number
My [Erdős number](https://en.wikipedia.org/wiki/Erd%C5%91s_number) is 4, calculated via two paths:

 - Dongheng Lin → [Jianbo Jiao](https://jianbojiao.com/) → [Ana I. L. Namburete](https://scholar.google.com/citations?user=6QzRJ6MAAAAJ) → [Israel Koren](https://scholar.google.com/citations?user=eFelBdoAAAAJ&hl) → [Paul Erdős](https://en.wikipedia.org/wiki/Paul_Erd%C5%91s)
 - Dongheng Lin → [Ka Lok Man](https://scholar.google.com/citations?user=Pa_xqn8AAAAJ&hl=en) → [Prudence W. H. Wong](https://scholar.google.co.uk/citations?user=vjIXDW4AAAAJ&hl=en) → [Shmuel Zaks](https://scholar.google.com/citations?user=rWc3QtgAAAAJ) → [Paul Erdős](https://en.wikipedia.org/wiki/Paul_Erd%C5%91s)
# 🦉 Site Visits

<html>
<head>
<style>
  /* Style for the widget container */
.carousel-item {
  height: 300px; Set the height 
  /* width: 60%; */
  padding: 10%;
  text-align: center; /* Center-align the content within the container */
}
.carousel-item img {
  object-fit: contain; /* This will cover the area of the carousel-item, you can adjust it as per your need */
  min-height: 100%;
  /* min-width: 100%; */
  /* width: 100%; */
}
  div#widget-container {
    width: 300px; /* Set the desired width */
    height: 200px; /* Set the desired height */
    margin: 0 auto; /* Center-align the container horizontally */
    text-align: center; /* Center-align the content within the container */
  }
  @media only screen and (max-width: 768px) {
    iframe {
        display: none;
    }
  }
  
</style>
</head>
  <body>
  <div id="widget-container">
    <script type='text/javascript' id='clustrmaps' src='//cdn.clustrmaps.com/map_v2.js?cl=080808&w=300&t=tt&d=2jXlKGzMnriy0ZWRRHcgHG2MARTylxM4nW7o16uKIlc&co=ffffff&cmo=3acc3a&cmn=ff5353&ct=808080'></script>
  </div>
  </body>
</html>
