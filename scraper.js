const puppeteer = require('puppeteer');
var request = require('request');

const {
    DEBUG_GROUP,
    TARGET_GROUP,
    TELEGRAM_BOT_TOKEN
} = process.env;




const stringIsInPage = async string => await page.evaluate(() => {
    const selector = 'body';
    return document.querySelector(selector).innerText.includes(string);
});



async function checkIfTicketsAvailable() {
    console.log('run');
    let ticketsAvailable = false;
    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();

    await page.goto('http://www.renfe.com/');

    const originSelector = "#IdOrigen"
    const destinationSelector = "#IdDestino"
    const dateSelector = "#__fechaIdaVisual"
    const submitButtonSelector = "#datosBusqueda > button"
    const resultsTableSelector = "#tab-listado"
    const stringNoResults = "El trayecto consultado no se encuentra disponible"

    // Set Origin
    await page.click(originSelector);
    await page.keyboard.type("Barcelona");
    await page.waitFor(500);
    page.keyboard.press('Enter');


    // Set Destination
    await page.click(destinationSelector);
    await page.keyboard.type("Sevilla");
    await page.waitFor(500);
    page.keyboard.press('Enter');

    // Set date
    let searchInput = await page.$(dateSelector);

    await searchInput.click({ clickCount: 3 });
    await searchInput.press('Backspace');
    await page.keyboard.type("15/12/2019");
    await page.waitFor(500);
    page.keyboard.press('Enter');

    // Submit
    await page.click(submitButtonSelector);

    // Wait for page load
    await page.waitFor(3 * 1000);
    try {
        await page.waitForFunction(
            `document.querySelector("body").innerText.includes("${stringNoResults}")`,
            { timeout: 3000 }
        );
        console.log('Results not public yet');
    } catch (e) {
        ticketsAvailable = true;
        console.log('Results seem to be published');
        // await page.screenshot({ path: 'page.png', fullPage: true });
    } finally {
        browser.close();
    }
    return ticketsAvailable;
}

const sendNotification = (ticketsAvailable) => {
    const targetTelegramChannel = DEBUG_GROUP
    const message = ticketsAvailable ? "Tickets available" : "Tickets not available"
    request(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${targetTelegramChannel}&text=${message}`, function (error, response, body) {
        console.log('error:', error); // Print the error if one occurred
        console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
        console.log('body:', body); // Print the HTML for the Google homepage.
    });
}

const checkAndNotify = async () => {
    const ticketsAvailable = await checkIfTicketsAvailable()
    sendNotification(ticketsAvailable)
}

exports.checkAndNotify = checkAndNotify