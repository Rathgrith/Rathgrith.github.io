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

 - Highly motivated Computer Engineering graduate student with expertise in Software Development and Artificial Intelligence. 
 - Skilled in Java, Python, Golang, C# and JavaScript. 
 - I have had solid research background in backdoor learning, feature representation in computer vision, and medical image segmentation. I have worked closely with [Dr.Erick Purwanto](https://www.researchgate.net/profile/Erick-Purwanto) and [Prof.Jie Zhang](https://scholar.google.com.hk/citations?user=NVdWSwoAAAAJ&hl=en) during my undergraduate study.
 - Experienced in full-stack software development and interned at Wensi Haihui Information Technology (Pactera) Co., Ltd. 
 - Also a published researcher with strong time management and teamwork skills. 
 - Fluent in English, Mandarin, and Japanese.

My recent research interest includes *robust machine learning* and *backdoor attacks in computer vision*.


# 🔥 News
- *2023.08*: &nbsp;🎉🎉 Started my Master degree in [UIUC ECE](https://ece.illinois.edu/).
- *2023.07*: &nbsp;🎉🎉 Got my distinction bachelor degree at [UOL](https://www.liverpool.ac.uk/computer-science/) and [XJTLU](https://www.xjtlu.edu.cn/en/study/undergraduate/information-and-computing-science). 

# 📝 Publications 

- [SPSS: A Salience-based Poisoning Selection Strategy for Selecting Backdoor Attack Victims](https://github.com/Rathgrith/SalientAttack), Zihan Lyu<sup>1</sup>, **Dongheng Lin<sup>1</sup>**, Jie Zhang<sup>†</sup>, Ruiming Zhang<sup>2</sup>, submitted to **USENIX Security 2024**
   - Designed an algorithm uses Salience Metric to evaluate sample feature significance towards backdoor learning process.
   - With its assistance, we managed to realized a more data-efficient backdoor attack to DNN models achieved the same attack success rate to vanilla backdoor attack with only 38.44% of poisoned samples.


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

# 📖 Educations
- *2023.08 - now*, MEng in Electrical and Computer Engineering, [University of Illinois, Urbana-Champaign]((https://ece.illinois.edu/))
- *2019.09 - 2023.07*, BSc in Information and Computing Science, [Xi'an Jiaotong-Liverpool University](https://www.xjtlu.edu.cn/en/study/undergraduate/information-and-computing-science)
- *2019.09 - 2023.07*, BSc in Information and Computing Science, [University of Liverpool](https://www.liverpool.ac.uk/computer-science/)

<!-- # 💬 Invited Talks
- *2022.10*, XJTLU STUDENT SYMPOSIUM OF RESEARCH-LED LEARNING, 1st Prize -->

# 💻 Internships
- *2021.06 - 2021.10*, Backend Developer Intern at [Pactera](https://en.pactera.com/), China.


# 🖨 Projects

<!-- <div class='paper-box'><div class='paper-box-image'><div><img src='images\d2p2d.svg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

[Statistical Evaluation on LLM Reversal Curse](/assets/598proposal.pdf)
  - This is a project that conducts statistical evaluation on whether an auto-regressive language model (LLM) that has learned “A is B” in training will generalize to the reversed form “B is A”
  - Instead of previous works that uses simple text matching that may not correctly evaluate the causal reverse outcome, we would like to devise a new quantitative metric based on sentence embedding and fact checking.
</div>
</div> -->

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


<div class='paper-box'><div class='paper-box-image'><div><img src='images\RLSBA.png' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

 - A tech report of our initial discovery on the relation of backdoor attack sample and its feature representation: [Random, Latent and Salient Backdoor Attacks on Deep-Learning Models](/assets/RLSBA.pdf)
</div>
</div>


# Miscellaneous

A typical [Otaku](https://en.wikipedia.org/wiki/Otaku). Favorite manga: [臨海センチメント (Nostalgic Ocean Landscape)](https://www.pixiv.net/artworks/37362275).

I also enjoy photography and music.

<div class='paper-box'><div class='paper-box-image'><div><img src='images\sunsetw.jpeg' alt="sym" width="100%"></div></div>
<div class='paper-box-text' markdown="1">

 - FUJIFILM Velvia RVP100, captured in my hometown.
</div>
</div>

<iframe frameborder="no" border="0" marginwidth="0" marginheight="0" width="100%" height="auto" src="//music.163.com/outchain/player?type=2&id=732185&auto=0&height=66"></iframe>

# 🦉 Site Visits

<html>
<head>
<style>
  /* Style for the widget container */
  div#widget-container {
    width: 300px; /* Set the desired width */
    height: 200px; /* Set the desired height */
    margin: 0 auto; /* Center-align the container horizontally */
    text-align: center; /* Center-align the content within the container */
  }
</style>
</head>
  <body>
  <div id="widget-container">
    <script type='text/javascript' id='clustrmaps' src='//cdn.clustrmaps.com/map_v2.js?cl=080808&w=300&t=tt&d=2jXlKGzMnriy0ZWRRHcgHG2MARTylxM4nW7o16uKIlc&co=ffffff&cmo=3acc3a&cmn=ff5353&ct=808080'></script>
  </div>
  </body>
</html>