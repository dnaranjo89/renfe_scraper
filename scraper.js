const puppeteer = require('puppeteer');

const stringIsInPage =  async string => await page.evaluate(() => {
    const selector = 'body';
    return document.querySelector(selector).innerText.includes(string);
  });

async function run() {
    const browser = await puppeteer.launch({
        headless: false
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
    
    await searchInput.click({clickCount: 3});
    await searchInput.press('Backspace'); 
    await page.keyboard.type("15/12/2019");
    await page.waitFor(500);
    page.keyboard.press('Enter');
    
    // Submit
    await page.click(submitButtonSelector);

    await page.waitFor(3*1000);
    try {

    await page.waitForFunction(
        `document.querySelector("body").innerText.includes("${stringNoResults}")`,
        {timeout:3000}
        );
    }catch(e){
        console.log('Results seem to be published', e);
        await page.screenshot({path: 'page.png', fullPage:true});
    }

        console.log('Results not public yet');
        await browser.close();

    browser.close();
}

const sendNotification = () =>{

}


// run();
const scrape = () => 'Yassss!';
exports.scrape = scrape