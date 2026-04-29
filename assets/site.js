const state = {
  content: null,
};

const selectors = {
  issueIndex: document.querySelector("#issue-index-list"),
  journalList: document.querySelector("#journal-list"),
  timelineList: document.querySelector("#timeline-list"),
  galleryGrid: document.querySelector("#gallery-grid"),
  preview: document.querySelector("#photo-preview"),
  previewImage: document.querySelector("#preview-image"),
  previewTitle: document.querySelector("#preview-title"),
  previewDate: document.querySelector("#preview-date"),
  navShell: document.querySelector(".nav-shell"),
  navToggle: document.querySelector(".nav-toggle"),
  navLinks: document.querySelector("#nav-links"),
};

let railSyncQueued = false;

function closeMobileNav() {
  selectors.navShell.classList.remove("is-open");
  selectors.navToggle.setAttribute("aria-expanded", "false");
  selectors.navToggle.setAttribute("aria-label", "打开导航");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function groupByIssue(journals) {
  const groups = new Map();

  for (const journal of journals) {
    if (!groups.has(journal.issue)) {
      groups.set(journal.issue, {
        issue: journal.issue,
        sortValue: journal.sortValue,
        items: [],
      });
    }
    groups.get(journal.issue).items.push(journal);
  }

  return Array.from(groups.values()).sort((a, b) => b.sortValue - a.sortValue);
}

function setActiveTimelineMonth(monthKey) {
  document.querySelectorAll(".timeline-step[data-month]").forEach((button) => {
    const active = button.dataset.month === monthKey;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-current", "true");
      const rail = button.closest(".timeline-rail");
      if (rail) {
        rail.scrollTop = button.offsetTop - rail.clientHeight / 2 + button.clientHeight / 2;
        rail.scrollLeft = button.offsetLeft - rail.clientWidth / 2 + button.clientWidth / 2;
      }
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function setActiveJournalIssue(issue) {
  document.querySelectorAll(".issue-link").forEach((button) => {
    const active = button.dataset.issue === issue;
    button.classList.toggle("is-active", active);
    if (active) {
      button.setAttribute("aria-current", "true");
      const horizontalRail = button.closest("#issue-index-list");
      if (horizontalRail && horizontalRail.scrollWidth > horizontalRail.clientWidth) {
        horizontalRail.scrollLeft = button.offsetLeft - horizontalRail.clientWidth / 2 + button.clientWidth / 2;
      } else {
        const rail = button.closest(".issue-index");
        if (rail) {
          rail.scrollTop = button.offsetTop - rail.clientHeight / 2 + button.clientHeight / 2;
          rail.scrollLeft = button.offsetLeft - rail.clientWidth / 2 + button.clientWidth / 2;
        }
      }
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function syncActiveRail() {
  const viewportCenter = window.innerHeight / 2;
  const sync = (itemSelector, dataKey, setter) => {
    const items = Array.from(document.querySelectorAll(itemSelector))
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.bottom > 90 && rect.top < window.innerHeight - 40;
      });

    if (!items.length) return;

    const closest = items
      .map((item) => {
        const rect = item.getBoundingClientRect();
        return {
          item,
          distance: Math.abs(rect.top + rect.height / 2 - viewportCenter),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0].item;

    setter(closest.dataset[dataKey]);
  };

  sync(".issue-block", "issue", setActiveJournalIssue);
  sync(".timeline-feature", "month", setActiveTimelineMonth);
}

function scheduleRailSync() {
  if (railSyncQueued) return;
  railSyncQueued = true;
  window.requestAnimationFrame(() => {
    railSyncQueued = false;
    syncActiveRail();
  });
}

function renderJournals(journals) {
  const groups = groupByIssue(journals);

  selectors.issueIndex.innerHTML = groups
    .map((group, index) => `
      <button class="timeline-step issue-link${index === 0 ? " is-active" : ""}" type="button" data-issue="${escapeHtml(group.issue)}" ${index === 0 ? 'aria-current="true"' : ""}>
        <span>${escapeHtml(group.issue)}</span>
        <small>${group.items.length} 篇投稿</small>
      </button>
    `)
    .join("");

  selectors.journalList.innerHTML = groups
    .map((group) => `
      <article class="issue-block" id="issue-${escapeHtml(group.issue)}" data-issue="${escapeHtml(group.issue)}">
        <div class="issue-heading">
          <span>${escapeHtml(group.issue)}</span>
          <small>${group.items.length} 篇投稿</small>
        </div>
        <div class="paper-stack">
          ${group.items.map((item) => `
            <a class="paper-row" href="${encodeURI(item.href)}" target="_blank" rel="noopener">
              <span class="paper-title">${escapeHtml(item.title)}</span>
              <span class="paper-meta">${escapeHtml(item.author)}</span>
            </a>
          `).join("")}
        </div>
      </article>
    `)
    .join("");

  document.querySelectorAll(".issue-link").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Array.from(document.querySelectorAll(".issue-block"))
        .find((item) => item.dataset.issue === button.dataset.issue);
      if (!target) return;
      const top = window.scrollY + target.getBoundingClientRect().top - 92;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveJournalIssue(button.dataset.issue);
    });
  });

  scheduleRailSync();
}

function renderTimeline(timeline) {
  selectors.timelineList.innerHTML = `
    <aside class="timeline-rail" aria-label="班级风采月份">
      ${timeline.map((group, index) => `
        <button class="timeline-step${index === 0 ? " is-active" : ""}" type="button" data-month="${escapeHtml(group.key)}" ${index === 0 ? 'aria-current="true"' : ""}>
          <span>${escapeHtml(group.label)}</span>
          <small>${group.count} 张照片</small>
        </button>
      `).join("")}
    </aside>
    <div class="timeline-feature-list">
      ${timeline.map((group) => {
        const photo = group.photos[0];
        return `
          <article class="timeline-feature" data-month="${escapeHtml(group.key)}">
            <figure class="timeline-feature-card">
              <img src="${encodeURI(photo.src)}" alt="${escapeHtml(photo.name)}" loading="lazy">
              <figcaption>
                <strong>${escapeHtml(photo.name)}</strong>
                <span>${escapeHtml(photo.displayDate)}</span>
              </figcaption>
            </figure>
          </article>
        `;
      }).join("")}
    </div>
  `;

  document.querySelectorAll(".timeline-step").forEach((button) => {
    button.addEventListener("click", () => {
      const target = Array.from(document.querySelectorAll(".timeline-feature"))
        .find((item) => item.dataset.month === button.dataset.month);
      if (!target) return;
      const top = window.scrollY + target.getBoundingClientRect().top - 92;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveTimelineMonth(button.dataset.month);
    });
  });

  scheduleRailSync();
}

function renderGallery() {
  const content = state.content;
  const photos = content.photos;

  selectors.galleryGrid.innerHTML = photos.length
    ? photos.map((photo, index) => `
      <button class="gallery-card" type="button" data-photo-index="${index}">
        <img src="${encodeURI(photo.src)}" alt="${escapeHtml(photo.name)}" loading="lazy">
        <span class="gallery-caption">
          <strong>${escapeHtml(photo.name)}</strong>
          <span>${escapeHtml(photo.displayDate)}</span>
        </span>
      </button>
    `).join("")
    : `<p class="empty-state">暂无照片。</p>`;

  selectors.galleryGrid.querySelectorAll(".gallery-card").forEach((card) => {
    card.addEventListener("click", () => {
      openPreview(content.photos[Number(card.dataset.photoIndex)]);
    });
  });
}

function openPreview(photo) {
  selectors.previewImage.src = encodeURI(photo.src);
  selectors.previewImage.alt = photo.name;
  selectors.previewTitle.textContent = photo.name;
  selectors.previewDate.textContent = photo.displayDate;
  selectors.preview.hidden = false;
  document.body.classList.add("is-preview-open");
  selectors.preview.querySelector(".preview-close").focus();
}

function closePreview() {
  selectors.preview.hidden = true;
  selectors.previewImage.removeAttribute("src");
  document.body.classList.remove("is-preview-open");
}

async function loadContent() {
  try {
    const response = await fetch("data/content.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.json();
    state.content = content;
    renderJournals(content.journals);
    renderTimeline(content.timeline);
    renderGallery();
  } catch (error) {
    selectors.journalList.innerHTML = `<p class="empty-state">无法读取 <code>data/content.json</code>。</p>`;
    console.error(error);
  }
}

selectors.preview.querySelectorAll("[data-preview-close]").forEach((button) => {
  button.addEventListener("click", closePreview);
});

selectors.navToggle.addEventListener("click", () => {
  const open = selectors.navShell.classList.toggle("is-open");
  selectors.navToggle.setAttribute("aria-expanded", String(open));
  selectors.navToggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
});

selectors.navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !selectors.preview.hidden) {
    closePreview();
  }
  if (event.key === "Escape" && selectors.navShell.classList.contains("is-open")) {
    closeMobileNav();
    selectors.navToggle.focus();
  }
});

window.addEventListener("scroll", scheduleRailSync, { passive: true });
window.addEventListener("resize", scheduleRailSync);

loadContent();
