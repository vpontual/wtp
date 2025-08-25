import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

// ------------------------------ Constants & helpers ------------------------------
// NOTE: This version is intended to be used with a local backend proxy.
// The URLs will need to be updated to point to your new server endpoints.
// Example: const SENATE_API_ENDPOINT = "/api/senate";
const HOUSE_ROLLS_BASE = "https://clerk.house.gov/evs/";
const SENATE_MENU_BASE =
  "https://www.senate.gov/legislative/LIS/roll_call_lists";

const LS_SETTINGS = "congress-vote-tracker:settings";

// Helper to calculate the correct year for a given Congress and Session
const getYearForCongress = (congress, session) =>
  1789 + (congress - 1) * 2 + (session - 1);

// These functions will be replaced by calls to your backend
const HOUSE_ROLLS_INDEX = (year) => `/api/house/${year}`;
const senateMenuUrl = (congress, session) =>
  `/api/senate/${congress}/${session}`;

// Helper to load settings from Local Storage
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    const defaults = {
      congress: 118,
      session: 2,
      includeHouse: true,
      includeSenate: true,
    };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return {
      congress: 118,
      session: 2,
      includeHouse: true,
      includeSenate: true,
    };
  }
}

// Helper to save settings to Local Storage
function saveSettings(s) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
}

// Utility to combine class names
function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

// Formats an ISO date string into a more readable local format
function fmtDate(iso) {
  if (!iso) return "N/A";
  const d = new Date(iso);
  return isNaN(d)
    ? String(iso)
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

// Robustly fetches and parses JSON from a URL
async function fetchJson(url, label = "") {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error(`${label || "URL"} failed (network): ${e?.message || e}`);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `${label || "URL"} failed (HTTP ${res.status}). ${text.slice(
        0,
        180
      )}`.trim()
    );
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(
      `${label || "URL"} returned invalid JSON. Response text: ${text.slice(
        0,
        180
      )}`
    );
  }
}

// Robustly fetches and parses XML from a URL
async function fetchXml(url, label = "") {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/xml,text/xml" } });
  } catch (e) {
    throw new Error(`${label || "URL"} failed (network): ${e?.message || e}`);
  }

  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `${label || "URL"} failed (HTTP ${res.status}). ${text.slice(
        0,
        180
      )}`.trim()
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err)
    throw new Error(`${label || "URL"} XML parse error: ${err.textContent}`);
  return doc;
}

// ------------------------------ React Components ------------------------------

// SettingsPanel: A component for user-configurable settings
function SettingsPanel({ settings, setSettings, onFetch, loading }) {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : parseInt(value, 10);
    setSettings((prev) => ({ ...prev, [name]: val }));
  };

  const handleSave = () => {
    saveSettings(settings);
    alert("Settings saved!");
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
        {/* Congress Input */}
        <div>
          <label
            htmlFor="congress"
            className="block text-sm font-medium text-gray-300"
          >
            Congress
          </label>
          <input
            type="number"
            name="congress"
            id="congress"
            value={settings.congress}
            onChange={handleInputChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
          />
        </div>
        {/* Session Input */}
        <div>
          <label
            htmlFor="session"
            className="block text-sm font-medium text-gray-300"
          >
            Session
          </label>
          <input
            type="number"
            name="session"
            id="session"
            value={settings.session}
            onChange={handleInputChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2"
          />
        </div>
        {/* Chamber Checkboxes */}
        <div className="flex items-center space-x-4 pt-6">
          <div className="flex items-center">
            <input
              id="includeSenate"
              name="includeSenate"
              type="checkbox"
              checked={settings.includeSenate}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-500 rounded bg-gray-700"
            />
            <label
              htmlFor="includeSenate"
              className="ml-2 block text-sm text-gray-300"
            >
              Senate
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="includeHouse"
              name="includeHouse"
              type="checkbox"
              checked={settings.includeHouse}
              onChange={handleInputChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-500 rounded bg-gray-700"
            />
            <label
              htmlFor="includeHouse"
              className="ml-2 block text-sm text-gray-300"
            >
              House
            </label>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="md:col-span-3 lg:col-span-2 flex items-center justify-end space-x-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
          >
            Save Settings
          </button>
          <button
            onClick={onFetch}
            disabled={loading}
            className="inline-flex justify-center items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 M 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Fetching...
              </>
            ) : (
              "Fetch Votes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [settings, setSettings] = useState(loadSettings);
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVotes = useCallback(async () => {
    if (!settings.includeHouse && !settings.includeSenate) {
      setError(
        "Please select at least one chamber (House or Senate) to fetch votes."
      );
      setVotes([]);
      return;
    }

    setLoading(true);
    setError(null);
    setVotes([]);

    try {
      let fetchedVotes = [];

      // Fetch Senate votes if included
      if (settings.includeSenate) {
        const url = senateMenuUrl(settings.congress, settings.session);
        const data = await fetchJson(url, "Senate Votes");
        if (data.roll_calls && data.roll_calls.roll_call) {
          const senateVotes = data.roll_calls.roll_call.map((v) => ({
            chamber: "Senate",
            number: v.vote_number,
            date: v.vote_date,
            title: `${v.issue.trim()}: ${v.question.trim()}`,
            result: `${v.result} (${v.counts.Yea}-${v.counts.Nay})`,
            key: `s-${settings.congress}-${settings.session}-${v.vote_number}`,
          }));
          fetchedVotes.push(...senateVotes);
        } else {
          console.warn(
            "Senate data format unexpected or no roll calls found.",
            data
          );
        }
      }

      // Fetch House votes if included
      if (settings.includeHouse) {
        const year = getYearForCongress(settings.congress, settings.session);
        const url = HOUSE_ROLLS_INDEX(year);
        const doc = await fetchXml(url, "House Votes");
        const houseVotes = Array.from(
          doc.querySelectorAll("rollcall-vote")
        ).map((v) => {
          const date =
            v.querySelector("action-date")?.textContent +
            "T" +
            v.querySelector("action-time")?.textContent;
          return {
            chamber: "House",
            number: v.querySelector("rollcall-num")?.textContent,
            date: date,
            title: v.querySelector("vote-question")?.textContent || "N/A",
            result: `${v.querySelector("vote-result")?.textContent} (${
              v.querySelector("totals-by-vote > yea-total")?.textContent
            }-${v.querySelector("totals-by-vote > nay-total")?.textContent})`,
            key: `h-${year}-${v.querySelector("rollcall-num")?.textContent}`,
          };
        });
        fetchedVotes.push(...houseVotes);
      }

      // Sort all votes by date, most recent first
      fetchedVotes.sort((a, b) => new Date(b.date) - new Date(a.date));
      setVotes(fetchedVotes);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [settings]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-center text-indigo-400">
            Congress Vote Tracker
          </h1>
          <p className="text-center text-gray-400 mt-2">
            View the latest roll call votes from the U.S. Senate and House of
            Representatives.
          </p>
        </header>

        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onFetch={fetchVotes}
          loading={loading}
        />

        {error && (
          <div
            className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative mb-6"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {!loading && votes.length === 0 && !error && (
          <div className="text-center py-16 px-6 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-300">
              No Votes Loaded
            </h3>
            <p className="text-gray-400 mt-2">
              Adjust your settings above and click "Fetch Votes" to begin.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {votes.map((vote) => (
            <div
              key={vote.key}
              className="bg-gray-800 shadow-lg rounded-lg p-5 transition-transform transform hover:scale-[1.02]"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3">
                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                  <span
                    className={classNames(
                      "font-bold text-sm px-3 py-1 rounded-full",
                      vote.chamber === "Senate"
                        ? "bg-blue-800 text-blue-200"
                        : "bg-green-800 text-green-200"
                    )}
                  >
                    {vote.chamber}
                  </span>
                  <p className="text-gray-400">Vote #{vote.number}</p>
                </div>
                <p className="text-sm text-gray-500 flex-shrink-0">
                  {fmtDate(vote.date)}
                </p>
              </div>
              <h2 className="text-lg font-semibold text-gray-200 mb-2">
                {vote.title}
              </h2>
              <p className="text-md font-mono bg-gray-900 px-3 py-1 rounded-md inline-block text-indigo-300">
                {vote.result}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
