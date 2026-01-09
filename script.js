/* ===============================
   COMMON UTILITIES
================================ */

/* This function is used to load the data */
async function loadJSON(view) {
  const res = await fetch(`data/${view}_Raw.json`);
  return await res.json();
}

// Normalize phone number
function normalizePhone(phone) {
  if (!phone) return null;
  return String(phone).slice(-10);
}

// Convert Excel serial date to JS Date
function excelDateToJSDate(serial) {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(excelEpoch.getTime() + serial * 86400000);
}

// ISO week calculation
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Time bucket generator
function addTimeBucket(row, dateCol, granularity) {
  const rawDate = row[dateCol];
  const date = typeof rawDate === "number"
    ? excelDateToJSDate(rawDate)
    : new Date(rawDate);

  if (granularity === "Daily") return date.toISOString().split("T")[0];
  if (granularity === "Weekly") return getISOWeek(date);
  if (granularity === "Monthly")
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

//Task 1

function task1Aggregate(data, dataView, granularity) {
  const entityMap = new Map();

  data.forEach(row => {
    let entity, dateCol;

    if (dataView === "Orders") {
      entity = normalizePhone(row.Phone);
      dateCol = "Order Date";
    }

    if (dataView === "Sessions") {
      entity = row.device_id || row["Device ID"] || row.deviceId;
      dateCol = "Session Date";
    }

    if (dataView === "Calls") {
      entity = normalizePhone(row.Phone);
      dateCol = "Call Date";
    }

    if (!entity) return;

    const timeBucket = addTimeBucket(row, dateCol, granularity);
    const key = `${timeBucket}_${entity}`;

    if (!entityMap.has(key)) {
      entityMap.set(key, { timeBucket, count: 0 });
    }

    entityMap.get(key).count++;
  });

  const timeMap = new Map();

  entityMap.forEach(rec => {
    timeMap.set(
      rec.timeBucket,
      (timeMap.get(rec.timeBucket) || 0) + rec.count
    );
  });

  return Array.from(timeMap.entries())
    .map(([timeBucket, total]) => ({ timeBucket, total }))
    .sort((a, b) => a.timeBucket.localeCompare(b.timeBucket));
}

//Task 2

let chartInstance = null;

function renderChart(aggregatedData, dataView, granularity) {
  const labels = aggregatedData.map(d => d.timeBucket);
  const values = aggregatedData.map(d => d.total);

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById("chart").getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: `${dataView} (${granularity})`,
        data: values,
        borderWidth: 2,
        fill: false
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// Task 3

function task3MatchOrdersWithCalls(ordersRaw, callsRaw, granularity) {

  // To Aggregate Orders by phone + time
  const ordersMap = new Map();

  ordersRaw.forEach(row => {
    const phone = normalizePhone(row.Phone);
    if (!phone) return;

    const timeBucket = addTimeBucket(row, "Order Date", granularity);
    if (!timeBucket) return;

    const key = `${timeBucket}_${phone}`;
    ordersMap.set(key, true); // presence marker
  });

  // TO Aggregate Calls by phone + time
  const callsMap = new Map();

  callsRaw.forEach(row => {
    const phone = normalizePhone(row.Phone);
    if (!phone) return;

    const timeBucket = addTimeBucket(row, "Call Date", granularity);
    if (!timeBucket) return;

    const key = `${timeBucket}_${phone}`;
    callsMap.set(key, (callsMap.get(key) || 0) + 1);
  });

  // To Match Orders Calls (same phone + same time)
  const resultMap = new Map();

  ordersMap.forEach((_, key) => {
    const [timeBucket] = key.split("_");

    if (!resultMap.has(timeBucket)) {
      resultMap.set(timeBucket, 0);
    }

    const callsCount = callsMap.get(key) || 0;
    resultMap.set(timeBucket, resultMap.get(timeBucket) + callsCount);
  });

  // to return derived metric
  return Array.from(resultMap.entries())
    .map(([timeBucket, totalCalls]) => ({
      timeBucket,
      totalCalls
    }))
    .sort((a, b) => a.timeBucket.localeCompare(b.timeBucket));
}


// this below code connects all tasks 

let currentView = "Orders";
let currentGranularity = "Daily";

async function updateDashboard() {
  const rawData = await loadJSON(currentView);

  // Task 1
  const aggregated = task1Aggregate(rawData, currentView, currentGranularity);

  // Task 2
  renderChart(aggregated, currentView, currentGranularity);

  // Task 3
  const insights = task3GenerateInsights(aggregated);
  renderInsights(insights);
}

document.getElementById("view").addEventListener("change", e => {
  currentView = e.target.value;
  updateDashboard();
});

document.getElementById("granularity").addEventListener("change", e => {
  currentGranularity = e.target.value;
  updateDashboard();
});


updateDashboard();


