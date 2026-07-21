---
permalink: /thoughts/
title: "Thoughts"
excerpt: "Short notes by Dongheng Lin."
author_profile: true
body_class: thoughts-page
---

<span class='anchor' id='thoughts'></span>

# Thoughts

<p class="thoughts-intro">Short notes, sketches, and fragments.</p>

<p class="thoughts-actions">
  <a class="thoughts-action" href="https://github.com/Rathgrith/Rathgrith.github.io/new/main/_thoughts" target="_blank" rel="noopener noreferrer">
    <i class="fa fa-github" aria-hidden="true"></i>
    <span>New thought</span>
  </a>
  <a class="thoughts-action" href="https://github.com/Rathgrith/Rathgrith.github.io/blob/main/_thoughts/2026-07-04-template.md" target="_blank" rel="noopener noreferrer">
    <i class="fa fa-file-text-o" aria-hidden="true"></i>
    <span>Template</span>
  </a>
</p>

{% assign thoughts = site.thoughts | sort: "date" | reverse %}

<div class="thought-list">
{% for thought in thoughts %}
  <article class="thought-card">
    <a class="thought-card__link" href="{{ thought.url | relative_url }}">
      {% if thought.date %}
        <time class="thought-card__date" datetime="{{ thought.date | date_to_xmlschema }}">{{ thought.date | date: "%Y.%m.%d" }}</time>
      {% endif %}
      <h2>{{ thought.title | escape }}</h2>
      {% assign thought_excerpt = thought.excerpt | markdownify | strip_html | strip_newlines %}
      {% if thought_excerpt != "" %}
        <p>{{ thought_excerpt | truncate: 180 }}</p>
      {% endif %}
      {% if thought.tags and thought.tags.size > 0 %}
        <span class="thought-card__tags">
          {% for tag in thought.tags limit: 4 %}
            <span>{{ tag }}</span>
          {% endfor %}
        </span>
      {% endif %}
    </a>
  </article>
{% else %}
  <p class="thought-list__empty">No thoughts yet.</p>
{% endfor %}
</div>
