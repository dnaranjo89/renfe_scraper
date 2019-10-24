const puppeteer = require('puppeteer');
var request = require('request');
var fs = require('fs');

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
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto('http://www.renfe.com/');

    const originSelector = "#IdOrigen"
    const destinationSelector = "#IdDestino"
    const dateSelector = "#__fechaIdaVisual"
    const submitButtonSelector = "#datosBusqueda > button"
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
    await page.keyboard.type("16/12/2019");
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
        ticketsAvailable = false;
    } catch (e) {
        ticketsAvailable = true;
        await page.screenshot({ path: 'screenshot.png', fullPage: true });
    } finally {
        browser.close();
    }
    return ticketsAvailable;
}

const sendNotification = (ticketsAvailable, ) => {
    const targetTelegramChannel = ticketsAvailable ? TARGET_GROUP : DEBUG_GROUP;
    const message = ticketsAvailable ? "Tickets available" : "Tickets not available"
    const sendMessageUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${targetTelegramChannel}&text=${message}`
    request(sendMessageUrl, function (error, response, body) {
        console.log('error:', error);
        console.log('statusCode:', response && response.statusCode);
        console.log('body:', body);
    });
    if (ticketsAvailable){
        const sendPhotoUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto?chat_id=${targetTelegramChannel}&text=${message}`
        const stream = fs.createReadStream('./screenshot.png');
        const formData = {
            photo: stream
        };
        request.post({ url: sendPhotoUrl, formData: formData }, function (err, resp, body) {
            if (err) {
                console.log('Error!');
            } else {
                console.log('URL: ' + body);
            }
        });
    }
}

const checkAndNotify = async () => {
    const ticketsAvailable = await checkIfTicketsAvailable()
    sendNotification(ticketsAvailable)
}

exports.checkAndNotify = checkAndNotify
