/**
 * Neighborhood data list.
 *
 * NOTE ON MCP: the datagov-mcp-server you linked speaks the Model Context
 * Protocol (JSON-RPC over stdio/SSE) — it's built for an AI client like
 * Claude to call, not for a browser's fetch(). A static page can't open
 * an MCP connection directly. What CAN run in the browser is data.gov's
 * own public CKAN REST API, which is what this file calls. See the
 * message below the code blocks for how the MCP server fits in instead.
 */

// Once your Vercel project is deployed, replace this with your
// function's URL, e.g.:
// "https://glover-park-mcp-api.vercel.app/api/data?q=glover+park+washington+dc"
const DATA_GOV_ENDPOINT =
  "https://catalog.data.gov/api/3/action/package_search?q=glover+park+washington+dc&rows=6";

const listEl = document.getElementById("dataset-list");

async function loadDatasets() {
  try {
    const res = await fetch(DATA_GOV_ENDPOINT);
    if (!res.ok) throw new Error(`data.gov responded ${res.status}`);

    const json = await res.json();
    const results = json?.result?.results ?? [];

    if (results.length === 0) {
      renderEmpty();
      return;
    }

    renderDatasets(results);
  } catch (err) {
    console.error("Could not load data.gov datasets:", err);
    renderError();
  }
}

function renderDatasets(datasets) {
  listEl.innerHTML = "";
  datasets.forEach((d) => {
    const li = document.createElement("li");

    const link = document.createElement("a");
    link.href = `https://catalog.data.gov/dataset/${d.name}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = d.title || d.name;

    const org = document.createElement("span");
    org.className = "dataset-org";
    org.textContent = d.organization?.title
      ? `${d.organization.title}`
      : "data.gov";

    li.appendChild(link);
    li.appendChild(org);
    listEl.appendChild(li);
  });
}

function renderEmpty() {
  listEl.innerHTML =
    '<li class="dataset-status">No matching datasets turned up on this search — browse ' +
    '<a href="https://catalog.data.gov" target="_blank" rel="noopener">catalog.data.gov</a> directly.</li>';
}

function renderError() {
  listEl.innerHTML =
    '<li class="dataset-status">Couldn\'t reach data.gov from the browser just now — ' +
    'try <a href="https://catalog.data.gov" target="_blank" rel="noopener">catalog.data.gov</a> directly.</li>';
}

loadDatasets();
