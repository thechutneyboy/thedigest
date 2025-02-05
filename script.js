function xmlToJson(xml) {
  let obj = {};

  if (xml.nodeType === 1) {
    // Element node
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let attr of xml.attributes) {
        obj["@attributes"][attr.nodeName] = attr.nodeValue;
      }
    }
  } else if (xml.nodeType === 3) {
    // Text node
    return xml.nodeValue.trim();
  }

  if (xml.hasChildNodes()) {
    for (let child of xml.childNodes) {
      let nodeName = child.nodeName;
      let childData = xmlToJson(child);

      if (child.nodeType === 3 && !childData) continue; // Skip empty text nodes

      if (obj[nodeName] === undefined) {
        obj[nodeName] = childData;
      } else {
        if (!Array.isArray(obj[nodeName])) {
          obj[nodeName] = [obj[nodeName]];
        }
        obj[nodeName].push(childData);
      }
    }
  }

  return obj;
}

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
                  <div class="card-footer py-1 bg-white rounded-0" style="border:none; border-bottom: 1px solid ${feedColor};">
                      <div class="px-3 fw-light position-absolute bottom-0 end-0" style="font-size: small; background: ${feedColor}; color: black;">
                        ${feed.title}
                      </div>
                  </div>
                </div>
            `;
          // bg-body border-bottom border-light-subtle rounded-0
          feedCards.push({ card: card, pubDate: new Date(item.pubDate) });
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
  sortedCards.forEach((c) => {
    feedItems.appendChild(c.card);
  });
}

function renderSidebar() {
  const rssUrls = loadRSSUrls();
  rssList.innerHTML = "";

  console.log(rssUrls);
  rssUrls.sort((a, b) => a.title.localeCompare(b.title));
  rssUrls.forEach((rss, index) => {
    const item = document.createElement("li");
    item.className = "list-group-item p-2";
    item.innerHTML = `
      <a href="#" class="link-offset-2 link-offset-3-hover link-underline link-underline-opacity-0 link-underline-opacity-75-hover">${
        rss.title
      }</a>
      <i class="bi bi-chevron-down" style="float: right; color: grey;" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}"></i>
      <div class="collapse bg-light" id="collapse${index}">
        <div class="d-flex justify-content-around">
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Edit RSS feed">
            <i class="bi bi-pencil-square" style="color: grey;"></i>
          </button>
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Copy RSS URL">
            <i class="bi bi-copy" style="color: grey;"></i>
          </button>
          <button type="button" class="btn btn-light" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="Visit Website">
            <a href="${rss.website || rss.url}" target="_blank">
              <i class="bi bi-box-arrow-up-right" style="color: grey;"></i>
            </a>
          </button>
          <button type="button" class="btn btn-light">
            <i class="bi bi-trash" style="color: red;"></i>
          </button>
        </div>
      </div>
      `;

    const feed = item.querySelector("a");
    feed.addEventListener("click", () => loadFeeds([rss]));

    const editBtn = item.querySelector(".bi-pencil-square");

    const copyBtn = item.querySelector(".bi-copy");
    copyBtn.addEventListener("click", (e) => {
      navigator.clipboard.writeText(rss.url);
      const toastLiveExample = document.getElementById("copyToast");
      const toastBootstrap =
        bootstrap.Toast.getOrCreateInstance(toastLiveExample);

      toastBootstrap.show();
    });

    const removeBtn = item.querySelector(".bi-trash");
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const rssUrls = loadRSSUrls();
      const updatedRSSUrls = rssUrls.filter((item) => item.url !== rss.url);
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
        const title = rsstitle; // Default to URL, replace with fetching title if needed
        rssUrls.push({
          url: rssUrl,
          title,
          paywall: false,
          website: rssWebsite,
          category: "Uncategorised",
        });
        saveRSSUrls(rssUrls);
        renderSidebar();
        rssInput.value = "";
      } else {
        alert("This RSS feed is already saved.");
      }
    }
  });
});
