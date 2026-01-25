function NormalizeURls(url: string){
    const urlobject = new URL(url)
    let fullURL = `${urlobject.host}${urlobject.pathname}`

    if(fullURL.slice(0, -1) === "/"){
        fullURL = fullURL.slice(0, -1)
    }

    return fullURL
}


function CSVEscape(field: string) {
  const str = field ?? "";
  const needsQuoting = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

class Espoinage{

  private async getH1fromHTML(html: string): Promise<string>{
    const {JSDOM} = require("jsdom")
     try{
        const domNodes = new JSDOM(html, {
           pretendToBeVisual: false,
           resources: "usable",
           runScripts: "outside-only",
        })
        const doc = domNodes.window.document;
        const h1 = doc.querySelector("h1")
        return (h1?.textContent ?? "").trim()
     }catch(err){
        return ''
     }
}
      
  private async getDivsfromHTML(html: string){
     const {JSDOM} = require("jsdom")

     try{
        const domNodes = new JSDOM(html)
        const doc = domNodes.window.document
        const div = doc.querySelectorAll("div")

        div.forEach((divs) => {
           return (divs.textContent ?? "").trim()
        })
     }catch(Err){
        if(Err instanceof Error){
            console.log(Err.message)
        }
     }
  }



 private async getFirstParagraphfromHTML(html: string): Promise<string>{
    const {JSDOM} = require("jsdom")
     try{
        const domNodes = new JSDOM(html, {
           pretendToBeVisual: false,
           resources: "usable",
           runScripts: "outside-only",
        })
        const doc = domNodes.window.document;
        const main = doc.querySelector("main")
        const p = main?.querySelector("p") ?? doc.querySelector("p")
        return (p?.textContent ?? "").trim()
     }catch(err){
        return ''
     }
}

  private async getStyleSheets(html: string, baseURL: string){
    const {JSDOM} = require("jsdom")
    const dom = new JSDOM(html)
    const urls: Array<string> = []

    const doc = dom.window.document
    const link = doc.querySelectorAll("link[rel='stylesheet']")
    link.forEach((links) => {
        const href = links.getAttribute("href")
        if(!href) return

        try{
            urls.push(new URL(href, baseURL).toString())
        }catch{}
    })

    return urls
  }
 
private async getURlsfromhtml(html: string, baseURL: string){
    const {JSDOM} = require("jsdom")
    const urls : string[] = [] 
    try{
        const domNodes = new JSDOM(html, {
           pretendToBeVisual: false,
           resources: "usable",
           runScripts: "outside-only",
        })
        const doc = domNodes.window.document
        const a = doc.querySelectorAll("a")
         a.forEach((anchor: HTMLElement) => {
            const href = anchor.getAttribute("href")

            if(!href){
                return
            }

            try{
                const absoluteURl = new URL(href, baseURL).toString()
                urls.push(absoluteURl)
            }catch(err){
                if(err instanceof Error){
                    console.log(`invalid href ${href}, ${err.message}`)
                }
            }
         })
    }catch(err){
        if(err instanceof Error){
            console.log(err.message)
        }
    }

    return urls
}   

        
private ExtractedPage({html, pageURL}: {html: string; pageURL: string;}){
  return {
    url: pageURL,
    h1: this.getH1fromHTML(html),
    first_paragraph: this.getFirstParagraphfromHTML(html),
    outgoing_links: this.getURlsfromhtml(html, pageURL),
    divs: this.getDivsfromHTML(html),
    styleSheets: this.getStyleSheets(html, pageURL)
  };
}
       
           
async getHTML(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);

    if (response.status >= 400) {
      console.log(`Skipping ${url} (HTTP ${response.status})`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("text/html")) {
      console.log(`Skipping ${url} (non-HTML)`);
      return null;
    }

    return await response.text();
  } catch (err) {
    console.log(`Fetch failed for ${url}`);
    return null;
  }
}   


async crawlPage(baseURL: string, currentURL: string, pages: Record<string, any>) {
  const base = new URL(baseURL);
  const current = new URL(currentURL);

  if (base.hostname !== current.hostname) return pages;

  const normalizedURL = NormalizeURls(currentURL);
  if (pages[normalizedURL]) return pages;

  const html = await this.getHTML(currentURL);

  pages[normalizedURL] = this.ExtractedPage({
    html,
    pageURL: currentURL,
  });

  const nextURLs = await this.getURlsfromhtml(html, baseURL);
  for (const nextURL of nextURLs) {
    await this.crawlPage(baseURL, nextURL, pages);
  }

  return pages;
}

   



writeCSVReport(pageData: Record<string, any>, filename = "report.csv"): void {
  const fs = require("fs");
  const path = require("path");

  const headers = [
    "page_url",
    "h1",
    "first_paragraph",
    "outgoing_link_urls",
    "web-divs",
    "styleSheets"
  ];

  const rows: string[] = [headers.join(",")];

  for (const page of Object.values(pageData)) {
    const row = [
      CSVEscape(page.url),
      CSVEscape(page.h1),
      CSVEscape(page.first_paragraph),
      CSVEscape(page.outgoing_links.join(";")),
      CSVEscape(page.div),
      CSVEscape(page.stylesheet)
    ];

    rows.push(row.join(","));
  }

  const filePath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(filePath, rows.join("\n"), "utf-8");
}



}



async function main(){
    const baseURL = 'https://blog.boot.dev'
    const pages = {}

    const crawler = new Espoinage()

    await crawler.crawlPage(baseURL, baseURL, pages)


    crawler.writeCSVReport(pages)
    console.log("report generated")
}

main()