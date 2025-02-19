const feedColor = "#dfdfdf";

const rssForm = document.getElementById("rss-form");
const rssInput = document.getElementById("rss-url");
const rssList = document.getElementById("rss-list");
const feedItems = document.getElementById("feed-items");

const storyCards = [];

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

  let cardList = await Promise.all(
    rssFeeds.map(async (feed) => {
      let feedCards = [];
      try {
        const data = await fetchFeed(feed.url);
        const items = data.items.slice(0, 10);
        // TODO: make limit configurable

        feedItems.innerHTML = "";
        items.forEach((item) => {
          const headline = item.title;
          const link = item.link;
          const pubDate =
            new Date(item.pubDate).toLocaleString([], {
              weekday: "short",
              day: "numeric",
              month: "short",
            }) +
            " • " +
            new Date(item.pubDate).toLocaleString([], {
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
                    <a href="${link}" class="h6 headlines link-dark link-offset-1 link-offset-1-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover" target="_blank">${headline}</a>
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
            title: feed.title,
            pubDate: new Date(item.pubDate),
            relativeTime: classifyDate(new Date(), item.pubDate),
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

  // Flatten, Sort and Remove Duplicates
  cardList = cardList.flat().sort((a, b) => b.pubDate - a.pubDate);
  cardList = Object.values(
    cardList.reduce((prev, curr) => {
      prev[curr.link] = curr;
      return prev;
    }, {})
  );
  storyCards.push(...cardList);
  renderPage(storyCards);
}

function renderPage(cardList) {
  feedItems.innerHTML = "";
  const partitions = new Set(cardList.map((c) => c.relativeTime));

  partitions.forEach((p) => {
    const partitionDiv = document.createElement("div");
    partitionDiv.innerHTML = `
      <div class="partition text-body-secondary g-0" style="font-size: small;">
          <span>
              <em>${p}</em>
          </span>
          <hr>
      </div>
    `;
    const partitionCardsDiv = document.createElement("div");
    partitionCardsDiv.className =
      "cards row row-cols-2 row-cols-sm-2 row-cols-md-4 g-1";
    partitionDiv.appendChild(partitionCardsDiv);

    feedItems.appendChild(partitionDiv);
    let cardsInPartition = cardList.filter((c) => c.relativeTime === p);
    cardsInPartition.forEach((c) => {
      partitionCardsDiv.appendChild(c.card);
    });
  });
}

function renderSidebar() {
  const rssUrls = loadRSSUrls();
  const rssUrlsMap = new Map(rssUrls.map((r) => [r.url, r]));
  rssList.innerHTML = "";

  let categories = new Set(
    [...rssUrls.map((r) => r.category)].filter(
      (c) => !["", "Google", "Reddit"].includes(c)
    )
  );
  const sortedCategories = [
    ...[""],
    ...[...categories].sort((a, b) => a.localeCompare(b)),
    ...["Google"],
    ...["Reddit"],
  ];
  console.log(sortedCategories);

  sortedCategories.forEach((category) => {
    const urlList = rssUrls.filter((r) => r.category === category);
    if (urlList.length !== 0) {
      const section = document.createElement("div");
      section.className = "accordion-item p-0";

      section.innerHTML = `
      <h6 class="accordion-header">
        <button class="accordion-button p-2" style="background-color: white; box-shadow:none;" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${category}" aria-expanded="true" aria-controls="collapse${category}">
          ${category}
        </button>
      </h6>
      <ul id="collapse${category}" class="accordion-collapse collapse show mb-2 p-0" >
      </ul>
      `;

      urlList.sort((a, b) => a.title.localeCompare(b.title));
      // console.log(category, urlList);
      urlList.forEach((rss, index) => {
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
            <i class="bi bi-chevron-down" style="float: right; color: grey;" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${
              category + index
            }" aria-expanded="false" aria-controls="collapse${
          category + index
        }"></i>
          </div>
          <div class="collapse bg-light" id="collapse${category + index}">
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
        let stories = storyCards.filter((c) => c.title === rss.title);
        feed.addEventListener("click", () => renderPage(stories));

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
          const labelBorderPreview =
            document.getElementById("labelBorderPreview");
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
          const toastCopy = document.getElementById("copyToast");
          const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastCopy);

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

        const sectionList = section.querySelector("ul");
        sectionList.appendChild(item);
      });

      rssList.appendChild(section);
    }
  });
  console.log(rssUrls);
}

document.addEventListener("DOMContentLoaded", async () => {
  const rssFeeds = loadRSSUrls();
  await loadFeeds(rssFeeds);
  renderSidebar();

  const refreshBtn = document.getElementById("refresh");
  refreshBtn.addEventListener("click", async () => {
    await loadFeeds(rssFeeds);
  });

  const feedType = document.getElementById("feed-type");
  feedType.addEventListener("change", () => {
    const prefix = document.getElementById("prefix");
    if (prefix) {
      prefix.remove();
    }
    if (feedType.value === "rss") {
      rssInput.placeholder = "RSS feed URL";
    } else if (feedType.value === "reddit") {
      rssInput.placeholder = "subreddit";
      const redditPrefix = document.createElement("div");
      const inputGroup = document.querySelector(".input-group");
      redditPrefix.className = "input-group-text";
      redditPrefix.innerHTML = "r/";
      redditPrefix.id = "prefix";
      inputGroup.insertBefore(redditPrefix, inputGroup.firstChild);
    } else if (feedType.value === "google") {
      rssInput.placeholder = "Keyword";
    }
  });

  // Handle form submission
  rssForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    let rssUrl = "";
    if (feedType.value === "rss") {
      rssUrl = rssInput.value.trim();
    } else if (feedType.value === "google") {
      rssUrl = `https://news.google.com/news/rss/search?q=${rssInput.value
        .trim()
        .replace(/ /g, "+")}`;
    } else if (feedType.value === "reddit") {
      rssUrl = `https://www.reddit.com/search.rss?q=r%2F${rssInput.value.trim()}&type=link&limit=20&sort=hot`;
    }

    const data = await fetchFeed(rssUrl);
    let rsstitle = data.feed.title;
    let category = "";
    if (feedType.value === "google") {
      rsstitle = rsstitle.replace(/["]| News/g, "");
      category = "Google";
    } else if (feedType.value === "reddit") {
      rsstitle = rsstitle.replace(/reddit.com: search results - /g, "");
      category = "Reddit";
    }
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
          category: category,
          color: getMatchingValueRegex(rssWebsite, colorMap) || feedColor,
        });
        saveRSSUrls(rssUrls);
        renderSidebar();

        const toastFeed = document.getElementById("feedAddedToast");
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastFeed);
        toastBootstrap.show();

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
