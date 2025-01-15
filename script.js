const rssForm = document.getElementById("rss-form");
const rssInput = document.getElementById("rss-url");
const rssList = document.getElementById("rss-list");
const feedItems = document.getElementById("feed-items");

const apiUrl = "https://api.rss2json.com/v1/api.json";

function loadRSSUrls() {
  return JSON.parse(localStorage.getItem("rssUrls")) || [];
}

async function loadFeeds(rssFeeds) {
  feedItems.innerHTML = "<li>Loading feed...</li>";

  const cardlist = await Promise.all(
    rssFeeds.map(async (feed) => {
      let feedCards = [];
      try {
        const response = await fetch(
          `${apiUrl}?rss_url=${encodeURIComponent(feed.url)}`
        );
        const data = await response.json();
        const items = data.items;

        feedItems.innerHTML = "";
        items.forEach((item) => {
          const title = item.title;
          const link = item.link;
          const pubDate = new Date(item.pubDate).toLocaleString([], {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });
          const img = item.enclosure.link || item.enclosure.thumbnail || "";

          // Create a card for each article
          const card = document.createElement("div");
          card.className = "card rounded-0 m-1 border-0";
          card.style = "max-width: 11rem;";
          card.innerHTML = `
                ${
                  img
                    ? `<img src="${img}" class="card-img-top rounded-0" alt="...">`
                    : ""
                }    
                <div class="card-body p-2">
                
                <h5>
                  <a href="${link}" class="link-dark link-offset-1 link-offset-1-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover" target="_blank">${title}</a>
                </h5>
                <p class="card-subtitle text-body-secondary" style="font-size: small;">${pubDate}</p>
                <div class="fw-light position-absolute bottom-0 end-0 px-3 bg-light" style="font-size: small;">
                  ${feed.title}
                </div>
              </div>
            `;
          feedCards.push({ card: card, pubDate: new Date(item.pubDate) });
        });
      } catch (error) {
        feedItems.innerHTML = "<li>Error loading feed.</li>";
      }

      return feedCards;
    })
  );

  const cards = cardlist.flat();
  const sortedCards = cards.sort((a, b) => b.pubDate - a.pubDate);
  sortedCards.forEach((c) => {
    feedItems.appendChild(c.card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Save RSS URLs to localStorage
  const saveRSSUrls = (rssUrls) => {
    localStorage.setItem("rssUrls", JSON.stringify(rssUrls));
  };

  // Render saved RSS URLs in the sidebar
  const renderRSSUrls = () => {
    const rssUrls = loadRSSUrls();
    rssList.innerHTML = "";

    rssUrls.forEach((rss, index) => {
      const li = document.createElement("li");
      li.className = "list-group-item p-1";
      const link = document.createElement("a");
      link.className =
        "link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover";
      link.href = "#";
      link.textContent = rss.title;
      link.addEventListener("click", () => loadFeeds([rss]));
      const removeBtn = document.createElement("i");
      removeBtn.className = "bi bi-trash";
      removeBtn.style.float = "right";
      removeBtn.style.color = "grey";
      removeBtn.style.cursor = "pointer";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeRSS(index);
      });
      li.appendChild(link);
      li.appendChild(removeBtn);
      rssList.appendChild(li);
    });
  };

  // Remove an RSS URL
  const removeRSS = (index) => {
    const rssUrls = loadRSSUrls();
    rssUrls.splice(index, 1);
    saveRSSUrls(rssUrls);
    renderRSSUrls();
  };

  // Handle form submission
  rssForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rssUrl = rssInput.value.trim();
    const response = await fetch(
      `${apiUrl}?rss_url=${encodeURIComponent(rssUrl)}`
    );

    const data = await response.json();
    const rsstitle = data.feed.title;

    if (rssUrl) {
      const rssUrls = loadRSSUrls();
      console.log(rssUrls);
      if (!rssUrls.some((rss) => rss.url === rssUrl)) {
        const title = rsstitle; // Default to URL, replace with fetching title if needed
        rssUrls.push({ url: rssUrl, title, paywall: false });
        saveRSSUrls(rssUrls);
        renderRSSUrls();
        rssInput.value = "";
      } else {
        alert("This RSS feed is already saved.");
      }
    }
  });

  // Initial render
  renderRSSUrls();
});

window.onload = function () {
  const rssFeeds = loadRSSUrls();

  loadFeeds(rssFeeds);
};
