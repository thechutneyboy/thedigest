const feedColor = "#dfdfdf";

const rssForm = document.getElementById("rss-form");
const rssInput = document.getElementById("rss-url");
const rssList = document.getElementById("rss-list");
const feedItems = document.getElementById("feed-items");

const apiUrl = "https://api.rss2json.com/v1/api.json";

function loadRSSUrls() {
  return JSON.parse(localStorage.getItem("rssUrls")) || [];
}

function saveRSSUrls(rssUrls) {
  return localStorage.setItem("rssUrls", JSON.stringify(rssUrls));
}

async function fetchFeed(rss_url) {
  try {
    const response = await fetch(
      `${apiUrl}?rss_url=${encodeURIComponent(rss_url)}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(error, "; Attempting XML parsing");

    const response = await fetch(rss_url);
    const data = await response.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data, "text/xml");
    const jsonResult = xmlToJson(xmlDoc.documentElement);

    return {
      feed: {
        title: jsonResult.channel.title["#text"],
      },
      items: jsonResult.channel.item.map((i) => ({
        title: i.title["#text"],
        link: i.link["#text"],
        pubDate: i.pubDate["#text"],
        enclosure: { link: i["media:content"]["@attributes"]["url"] },
      })),
    };
  }
}

async function loadFeeds(rssFeeds) {
  feedItems.innerHTML = "<li>Loading feed...</li>";

  const cardlist = await Promise.all(
    rssFeeds.map(async (feed) => {
      let feedCards = [];
      try {
        const data = await fetchFeed(feed.url);
        const items = data.items.slice(0, 10);
        // TODO: make limit configurable

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
          card.className = "col d-flex align-items-stretch";
          card.innerHTML = `
                <div class="card rounded-0 m-1 border-0 bg-white">
                  <div class="img-container">${
                    img
                      ? `<img src="${img}" class="card-img-top rounded-0" alt="...">`
                      : ""
                  }
                  </div>    
                  <div class="card-body p-2">
                    <a href="${link}" class="h6 headlines link-dark link-offset-1 link-offset-1-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover" target="_blank">${title}</a>
                    <p class="card-subtitle text-body-secondary py-2" style="font-size: small;">${pubDate}</p>
                  </div>
                  <div class="card-footer py-1 bg-white rounded-0" style="border:none; border-bottom: 1px solid ${
                    feed.color || feedColor
                  };">
                      <div class="px-3 fw-light position-absolute bottom-0 end-0" style="font-size: small; background: ${
                        feed.color || feedColor
                      }; color: ${getBestTextColor(feed.color || feedColor)};">
                        ${feed.title}
                      </div>
                  </div>
                </div>
            `;
          // bg-body border-bottom border-light-subtle rounded-0
          feedCards.push({
            card: card,
            pubDate: new Date(item.pubDate),
            link: link,
          });
        });
      } catch (error) {
        console.log(error);
        feedItems.innerHTML = "<li>Error loading feed.</li>";
      }

      return feedCards;
    })
  );

  const cards = cardlist.flat();
  const sortedCards = cards.sort((a, b) => b.pubDate - a.pubDate);
  const uniqueCards = Object.values(
    sortedCards.reduce((prev, curr) => {
      prev[curr.link] = curr;
      return prev;
    }, {})
  );

  uniqueCards.forEach((c) => {
    feedItems.appendChild(c.card);
  });
}

function renderSidebar() {
  const rssUrls = loadRSSUrls();
  const rssUrlsMap = new Map(rssUrls.map((r) => [r.url, r]));
  rssList.innerHTML = "";

  console.log(new Set([...rssUrls.map((r) => r.category)]));
  const categories = new Set([...rssUrls.map((r) => r.category)]);

  console.log(rssUrls);
  rssUrls.sort((a, b) => a.title.localeCompare(b.title));
  rssUrls.forEach((rss, index) => {
    const item = document.createElement("li");
    item.className = "list-group-item p-2";
    item.innerHTML = `
      <div class="d-flex justify-content-between" style="border-left: 4px solid ${
        rss.color || feedColor
      };">
        <a href="#" class="ps-2 link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover flex-grow-1">${
          rss.title
        }</a>
        <div class="form-check form-switch">
          <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckChecked" checked>
        </div>
        <i class="bi bi-chevron-down" style="float: right; color: grey;" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}"></i>
      </div>
      <div class="collapse bg-light" id="collapse${index}">
        <div class="d-flex justify-content-around">
          <div data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Edit Feed">
            <button type="button" class="btn btn-light" data-bs-toggle="modal" data-bs-target="#feedDetails">
              <i class="bi bi-pencil-square" style="color: grey;" ></i>
            </button>
          </div>
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Copy RSS URL">
            <i class="bi bi-copy" style="color: grey;"></i>
          </button>
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Visit Website">
            <a href="${rss.website || rss.url}" target="_blank">
              <i class="bi bi-box-arrow-up-right" style="color: grey;"></i>
            </a>
          </button>
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Remove feed">
            <i class="bi bi-trash" style="color: red;"></i>
          </button>
        </div>
      </div>
      `;

    const feed = item.querySelector("a");
    feed.addEventListener("click", () => loadFeeds([rss]));

    const editBtn = item.querySelector(".bi-pencil-square");
    editBtn.addEventListener("click", (e) => {
      const modal = document.getElementById("feedDetailsBody");
      modal.innerHTML = `
      <form id="feedDetailsForm" class="row g-3">
        <div class="mb-3">
          <label for="rssTitle" class="form-label">Title</label>
          <input type="text" class="form-control" id="rssTitle" value="${
            rss.title
          }">
        </div>
        <div class="mb-3">
          <label for="rssUrl" class="form-label">XML URL</label>
          <input type="text" class="form-control" id="rssUrl" value="${
            rss.url
          }" disabled>
        </div>
        <div class="mb-3">
          <label for="rssWebsite" class="form-label">Website</label>
          <input type="text" class="form-control" id="rssWebsite" value="${
            rss.website || rss.url
          }" disabled>
        </div>
        <div class="mb-3">
          <label for="rssCategory" class="form-label">Category</label>
          <input type="text" class="form-control" id="rssCategory" placeholder="" value="${
            rss.category || ""
          }">
        </div>
        <div class="mb-3">
          <label for="rssColorBg" class="form-label">Label Color</label>
          <input type="color" class="form-control form-control-color" id="rssColorBg" value="${
            rss.color || feedColor
          }">
        </div>
        <div class="row d-flex justify-content-center">
          <div id="labelBorderPreview" class="col-6 m-3 p-2 bg-white rounded-0 position-relative" style="border:none; border-bottom: 1px solid ${
            rss.color || feedColor
          };">
            <div id="labelPreview" class="px-3 position-absolute bottom-0 end-0" style="font-size: small; background: ${
              rss.color || feedColor
            }; color: ${getBestTextColor(rss.color || feedColor)};">
                ${rss.title}
            </div>
          </div>
        </div>
        <div class="row d-flex justify-content-center">
          <button id="saveFeedDetails" type="submit" class="btn btn-primary col-3" data-bs-dismiss="modal" disabled>Save</button>
        </div>
      </form>
      `;

      const titleInput = document.getElementById("rssTitle");
      const bgColorInput = document.getElementById("rssColorBg");
      const labelBorderPreview = document.getElementById("labelBorderPreview");
      const labelPreview = document.getElementById("labelPreview");

      titleInput.addEventListener("input", () => {
        labelPreview.innerHTML = titleInput.value;
      });
      bgColorInput.addEventListener("input", () => {
        labelPreview.style.color = getBestTextColor(bgColorInput.value);
        labelPreview.style.backgroundColor = bgColorInput.value;
        labelBorderPreview.style.borderBottomColor = bgColorInput.value;
      });

      const form = document.getElementById("feedDetailsForm");
      const saveBtn = document.getElementById("saveFeedDetails");

      form.addEventListener("input", (e) => {
        e.stopImmediatePropagation();
        saveBtn.disabled = false;
      });

      saveBtn.addEventListener("click", (e) => {
        console.log("Saving feed details");
        console.log(rss);

        rss.title = titleInput.value;
        rss.category = rssCategory.value;
        rss.color = bgColorInput.value;

        rssUrlsMap.delete(rss.url);
        rssUrlsMap.set(rss.url, rss);
        const updatedRSSUrls = Array.from(rssUrlsMap.values());

        saveRSSUrls(updatedRSSUrls);
        renderSidebar();
      });
    });

    const copyBtn = item.querySelector(".bi-copy");
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      navigator.clipboard.writeText(rss.url);
      const toastLiveExample = document.getElementById("copyToast");
      const toastBootstrap =
        bootstrap.Toast.getOrCreateInstance(toastLiveExample);

      toastBootstrap.show();
    });

    const removeBtn = item.querySelector(".bi-trash");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      rssUrlsMap.delete(rss.url);
      const updatedRSSUrls = Array.from(rssUrlsMap.values());

      saveRSSUrls(updatedRSSUrls);
      renderSidebar();
    });

    rssList.appendChild(item);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  renderSidebar();

  const rssFeeds = loadRSSUrls();
  await loadFeeds(rssFeeds);

  // Handle form submission
  rssForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const rssUrl = rssInput.value.trim();
    const data = await fetchFeed(rssUrl);
    const rsstitle = data.feed.title;
    const rssWebsite = data.feed.link;

    if (rssUrl) {
      const rssUrls = loadRSSUrls();
      console.log(rssUrls);
      if (!rssUrls.some((rss) => rss.url === rssUrl)) {
        const title = rsstitle;
        rssUrls.push({
          url: rssUrl,
          title: title,
          paywall: false,
          website: rssWebsite,
          category: "",
          color: getMatchingValueRegex(rssWebsite, colorMap) || feedColor,
        });
        saveRSSUrls(rssUrls);
        renderSidebar();
        rssInput.value = "";
      } else {
        alert("This RSS feed is already saved.");
      }
    }
  });

  // Initialize tooltips
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );
});
