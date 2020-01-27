const puppeteer = require("puppeteer");
var request = require("request");
var fs = require("fs");

const { NETWORK_PRESETS } = require("./networkPresets.js");

const { DEBUG_GROUP, TARGET_GROUP, TELEGRAM_BOT_TOKEN } = process.env;

const throttleConnection = page => {
  // Connect to Chrome DevTools
  const client = await page.target().createCDPSession();

  // Set throttling property
  await client.send("Network.emulateNetworkConditions", {
    ...NETWORK_PRESETS.Regular3G
  });
}

const areTicketsAvailable = async () => {
  try {
    await page.waitForFunction('document.querySelector("body")', {
      timeout: 15000
    });
    await page.waitForFunction(
      `document.querySelector("body").innerText.includes("${stringNoResults}")`,
      { timeout: 15000 }
    );
    return false;
  } catch (e) {
    return true;
  }
};

async function checkIfTicketsAvailable(headless) {
  let ticketsAvailable = false;
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless
  });

  const page = await browser.newPage();

  await page.goto("http://www.renfe.com/");

  const originSelector = "#IdOrigen";
  const destinationSelector = "#IdDestino";
  const dateSelector = "#__fechaIdaVisual";
  const submitButtonSelector = "#datosBusqueda > button";
  const stringNoResults = "El trayecto consultado no se encuentra disponible";

  // Set Origin
  await page.click(originSelector);
  await page.keyboard.type("Sevilla");
  await page.waitFor(500);
  page.keyboard.press("Enter");

  // Set Destination
  await page.click(destinationSelector);
  await page.keyboard.type("Barcelona");
  await page.waitFor(500);
  page.keyboard.press("Enter");

  // Set date
  let searchInput = await page.$(dateSelector);

  await searchInput.click({ clickCount: 3 });
  await searchInput.press("Backspace");
  await page.keyboard.type("02/03/2020");
  await page.waitFor(500);
  page.keyboard.press("Enter");

  // Submit
  await page.click(submitButtonSelector);

  // Throttle connection
  // throttleConnection()

  // Wait for page redirect
  await page.waitFor(5000);
  const ticketsAvailable = areTicketsAvailable();
  if (ticketsAvailable) {
    await page.screenshot({ path: "screenshot.png", fullPage: true });
  }
  browser.close();

  return ticketsAvailable;
}

const sendNotification = ticketsAvailable => {
  const targetTelegramChannel = ticketsAvailable ? TARGET_GROUP : DEBUG_GROUP;
  const message = ticketsAvailable
    ? "Tickets available"
    : "Tickets not available";
  const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${targetTelegramChannel}&text=${message}`;
  request(sendMessageUrl, function(error, response, body) {
    console.log("statusCode:", response && response.statusCode);
    console.log("body:", body);
    if (error) {
      console.log("error:", error);
    }
  });
  if (ticketsAvailable) {
    const sendPhotoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto?chat_id=${targetTelegramChannel}&text=${message}`;
    const stream = fs.createReadStream("./screenshot.png");
    const formData = {
      photo: stream
    };
    request.post({ url: sendPhotoUrl, formData: formData }, function(
      err,
      resp,
      body
    ) {
      if (err) {
        console.log("Error!");
      } else {
        console.log("URL: " + body);
      }
    });
  }
};

const checkAndNotify = async (headless = true) => {
  const ticketsAvailable = await checkIfTicketsAvailable(headless);
  sendNotification(ticketsAvailable);
};

exports.checkAndNotify = checkAndNotify;
