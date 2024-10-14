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
 - Motivated Computer Engineering graduate student with expertise in Software Development and Deep Learning. 
 - I am currently working under the supervision of [Prof. Jianbo Jiao](https://jianbojiao.com/) on Representation Learning and Application on Computer Vision tasks. 
 - I have had some research background in backdoor learning, visual representation learning, and medical image segmentation. I have worked closely with [Dr. Erick Purwanto](https://www.researchgate.net/profile/Erick-Purwanto) and [Prof. Jie Zhang](https://scholar.google.com.hk/citations?user=NVdWSwoAAAAJ&hl=en) during my undergraduate study.
 <!-- - Experienced in full-stack software development and interned at Wensi Haihui Information Technology (Pactera) Co., Ltd.  -->
 <!-- - Also a published researcher with strong time management and teamwork skills.  -->
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


# 🖨 Projects

<!-- <div class='paper-box'><div class='paper-box-image'><div><img src='images\d2p2d.svg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

[Statistical Evaluation on LLM Reversal Curse](/assets/598proposal.pdf)
  - This is a project that conducts statistical evaluation on whether an auto-regressive language model (LLM) that has learned “A is B” in training will generalize to the reversed form “B is A”
  - Instead of previous works that uses simple text matching that may not correctly evaluate the causal reverse outcome, we would like to devise a new quantitative metric based on sentence embedding and fact checking.
</div>
</div> -->

<div class='paper-box'><div class='paper-box-image'><div><img src='images\recafter.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
[Arxiv Explorer](https://github.com/Rathgrith/CS410Project): An efficient paper recommendation system we developed on a full dataset of all available Arxiv Papers (until Feb 2024).
  - All papers are compressed into paper embeddings using category, abstract, and title, stored in a FAISS indexing system.
  - We modeled a coauthorship map to conduct authority/hub based HITS reranking of the paper recommendation results.
</div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><img src='images\MapleJuice.jpg' alt="sym" width="100%"></div></div>
  <div class='paper-box-text' markdown="1">
  [MapleJuice: A light-weight counterpart of Hadoop supported with SQL-like query](https://github.com/Rathgrith/ece428_mp4)
 - The distributed system is built upon a self-implemented file system similar to GFS with corresponding NameNode and DataNode.
 - We also implemented an efficient Gossip-style failure detection protocol to maintain all the node status using UDP packets, a Bully-algorithm based re-election ensures new leader will be available in case of any failures on master nodes.
 - The task scheduling mechanism is similar to MapReduce, ensures the parallelism among nodes. We tested the system against Hadoop within a cluster with 10 VMs. The MapleJuice is generally 25% faster than Hadoop when dealing with small clusters.
  </div>
</div>

<div class='paper-box'><div class='paper-box-image'><div><img src='images\1698952628334.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">
My undergraduate thesis: [StyleDiffuser: Cartoon-Style Image Creation with Diffusion Model and GAN Fusion](/assets/FYP_Thesis.pdf)
 - In this work, I have introduced a novel approach that fuses Generative Adversarial Networks (GANs) with the Stable Diffusion Model for creating cartoon-style images.
 - Utilizes StyleGAN2 generated feature maps and corresponding metadata to constrain the Stable Diffusion Network.
 - Reduces the number of diffusion steps required for the model to converge to a final image, streamlining the image generation process.
 - The method reduces the reliance on verbose prompts for controlling the output, making the generation process more straightforward.
</div>
</div>
Apart from these projects, here are few interesting written homeworks to refer: [Homework Samples]({{ '/pdf-list/' | relative_url }}).


<!-- <div class='paper-box'><div class='paper-box-image'><div><img src='images\RLSBA.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

 - A tech report of our initial discovery on the relation of backdoor attack sample and its feature representation: [Random, Latent and Salient Backdoor Attacks on Deep-Learning Models](/assets/RLSBA.pdf)
</div>
</div> -->



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
<!-- <div id="carouselExampleIndicators" class="carousel slide" data-interval="false">
  <ol class="carousel-indicators">
    <li data-target="#carouselExampleIndicators" data-slide-to="0" class="active"></li>
    <li data-target="#carouselExampleIndicators" data-slide-to="1"></li>
    <li data-target="#carouselExampleIndicators" data-slide-to="2"></li>
  </ol>
  <div class="carousel-inner">
    {% for i in (1..3) %}
    <div class="carousel-item {% if forloop.first %}active{% endif %}">
      <img class="d-block w-100" src="{{ '/images/UIUCphoto/' | append: forloop.index | append: '.jpg' | relative_url }}" alt="Slide {{ forloop.index }}">
    </div>
    {% endfor %}
  </div>
  <a class="carousel-control-prev" href="#carouselExampleIndicators" role="button" data-slide="prev">
    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
    <span class="sr-only">Previous</span>
  </a>
  <a class="carousel-control-next" href="#carouselExampleIndicators" role="button" data-slide="next">
    <span class="carousel-control-next-icon" aria-hidden="true"></span>
    <span class="sr-only">Next</span>
  </a>
</div> -->



<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width="100%" height="auto" src="//music.163.com/outchain/player?type=2&id=732185&auto=0&height=66"></iframe>


BTW, my Erdős number is 4:

Dongheng Lin → Jianbo Jiao → Ana I. L. Namburete → Israel Koren → Paul Erdős

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