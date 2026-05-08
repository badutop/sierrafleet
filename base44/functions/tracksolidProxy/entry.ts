import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import md5lib from 'npm:md5@2.3.0';

// --- Config ---
const API_URL = Deno.env.get("TRACKSOLID_API_URL") || "https://hk-open.tracksolidpro.com/route/rest";
const APP_KEY = Deno.env.get("TRACKSOLID_APP_KEY") || "DEMO_APP_KEY";
const APP_SECRET = Deno.env.get("TRACKSOLID_APP_SECRET") || "DEMO_APP_SECRET";
const USER_ID = Deno.env.get("TRACKSOLID_USER_ID") || "DEMO_USER";
const USER_PWD_MD5 = Deno.env.get("TRACKSOLID_USER_PWD_MD5") || "21218cca77804d2ba1922c33e0151105";

// In-memory token cache
let cachedToken = null;
let tokenExpiresAt = 0;

// --- MD5 helper ---
function md5(message) {
  return md5lib(message).toUpperCase();
}

// Build sign: md5(appSecret + sorted_params_keyvalue + appSecret) uppercase
async function buildSign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}${params[k]}`).join("");
  const raw = `${APP_SECRET}${sorted}${APP_SECRET}`;
  return md5(raw);
}

// UTC timestamp for API
function utcTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth()+1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
}

// Call Tracksolid API
async function callApi(method, privateParams = {}) {
  const timestamp = utcTimestamp();
  const commonParams = {
    method,
    timestamp,
    app_key: APP_KEY,
    sign_method: "md5",
    v: "1.0",
    format: "json",
  };
  const allParams = { ...commonParams, ...privateParams };
  const sign = await buildSign(allParams);
  
  const body = new URLSearchParams({ ...allParams, sign });
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  return resp.json();
}

// Get or refresh access token
async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const data = await callApi("jimi.oauth.token.get", {
    user_id: USER_ID,
    user_pwd_md5: USER_PWD_MD5,
    expires_in: 7200,
  });

  if (data.code !== 0) throw new Error(`Token error: ${data.message}`);
  cachedToken = data.result.accessToken;
  tokenExpiresAt = now + (data.result.expiresIn - 60) * 1000;
  return cachedToken;
}

// --- Route handlers ---

async function handleGetLocations(body) {
  const token = await getAccessToken();
  const target = body.target || USER_ID;
  const data = await callApi("jimi.user.device.location.list", {
    access_token: token,
    target,
  });
  return data;
}

async function handleGetDevices(body) {
  const token = await getAccessToken();
  const target = body.target || USER_ID;
  const data = await callApi("jimi.user.device.list", {
    access_token: token,
    target,
  });
  return data;
}

async function handleGetTrack(body) {
  const token = await getAccessToken();
  const { imei, begin_time, end_time } = body;
  const data = await callApi("jimi.device.track.list", {
    access_token: token,
    imei,
    begin_time,
    end_time,
    map_type: "GOOGLE",
  });
  return data;
}

async function handleGetAlarms(body) {
  const token = await getAccessToken();
  const { imei, begin_time, end_time } = body;
  const data = await callApi("jimi.device.alarm.list", {
    access_token: token,
    imei,
    begin_time,
    end_time,
  });
  return data;
}

async function handleGetMileage(body) {
  const token = await getAccessToken();
  const { imei, begin_time, end_time } = body;
  const data = await callApi("jimi.device.track.mileage", {
    access_token: token,
    imei,
    begin_time,
    end_time,
  });
  return data;
}

async function handleGetTrips(body) {
  const token = await getAccessToken();
  const { imei, begin_time, end_time } = body;
  const data = await callApi("jimi.open.platform.report.trips", {
    access_token: token,
    imei,
    begin_time,
    end_time,
  });
  return data;
}

// --- Demo / mock data when credentials are not real ---
function isDemoMode() {
  return !Deno.env.get("TRACKSOLID_APP_KEY") || Deno.env.get("TRACKSOLID_APP_KEY") === "DEMO_APP_KEY";
}

function getMockLocations() {
  return {
    code: 0,
    message: "success (DEMO)",
    result: [
      { imei: "860000000000001", deviceName: "CT32 - DEMO", vehicleNumber: "DK-AA-1234", lat: 14.6937, lng: -17.4441, speed: 45, direction: 90, positionTime: new Date().toISOString().replace("T", " ").slice(0, 19), acc: 1, status: "moving", address: "Dakar, Sénégal" },
      { imei: "860000000000002", deviceName: "CT45 - DEMO", vehicleNumber: "DK-BB-5678", lat: 14.7200, lng: -17.4600, speed: 0, direction: 0, positionTime: new Date().toISOString().replace("T", " ").slice(0, 19), acc: 0, status: "parking", address: "Pikine, Sénégal" },
      { imei: "860000000000003", deviceName: "CT18 - DEMO", vehicleNumber: "DK-CC-9012", lat: 14.6800, lng: -17.4300, speed: 62, direction: 270, positionTime: new Date().toISOString().replace("T", " ").slice(0, 19), acc: 1, status: "moving", address: "Guédiawaye, Sénégal" },
    ]
  };
}

function getMockDevices() {
  return {
    code: 0, message: "success (DEMO)",
    result: [
      { imei: "860000000000001", deviceName: "CT32 - DEMO", vehicleNumber: "DK-AA-1234", mcType: "GT300L", enabledFlag: 1 },
      { imei: "860000000000002", deviceName: "CT45 - DEMO", vehicleNumber: "DK-BB-5678", mcType: "GT300L", enabledFlag: 1 },
      { imei: "860000000000003", deviceName: "CT18 - DEMO", vehicleNumber: "DK-CC-9012", mcType: "GT300L", enabledFlag: 1 },
    ]
  };
}

function getMockTrack(imei) {
  const pts = [];
  const base = { lat: 14.6937, lng: -17.4441 };
  for (let i = 0; i < 20; i++) {
    pts.push({ lat: base.lat + (i * 0.003), lng: base.lng + (i * 0.004), speed: 40 + Math.floor(Math.random()*20), positionTime: new Date(Date.now() - (20-i)*5*60000).toISOString().replace("T"," ").slice(0,19) });
  }
  return { code: 0, message: "success (DEMO)", result: pts };
}

function getMockAlarms() {
  return {
    code: 0, message: "success (DEMO)",
    result: [
      { imei: "860000000000001", alarmType: "SPEEDING", alarmTime: new Date(Date.now() - 3600000).toISOString().replace("T"," ").slice(0,19), address: "Autoroute Dakar-Diamniadio", speed: 120 },
      { imei: "860000000000002", alarmType: "FENCE_OUT", alarmTime: new Date(Date.now() - 7200000).toISOString().replace("T"," ").slice(0,19), address: "Rufisque", speed: 55 },
    ]
  };
}

// --- Main ---
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    let result;
    if (isDemoMode()) {
      // Return mock data for testing
      switch (action) {
        case "locations": result = getMockLocations(); break;
        case "devices": result = getMockDevices(); break;
        case "track": result = getMockTrack(body.imei); break;
        case "alarms": result = getMockAlarms(); break;
        case "mileage": result = { code: 0, message: "success (DEMO)", result: [{ imei: body.imei, mileage: 342.5 }] }; break;
        case "trips": result = { code: 0, message: "success (DEMO)", result: [] }; break;
        default: result = { error: "Unknown action" };
      }
    } else {
      switch (action) {
        case "locations": result = await handleGetLocations(body); break;
        case "devices": result = await handleGetDevices(body); break;
        case "track": result = await handleGetTrack(body); break;
        case "alarms": result = await handleGetAlarms(body); break;
        case "mileage": result = await handleGetMileage(body); break;
        case "trips": result = await handleGetTrips(body); break;
        default: result = { error: "Unknown action" };
      }
    }
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});