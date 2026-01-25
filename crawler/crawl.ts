function NormalizeURls(url: string){
    const urlobject = new URL(url)
    let fullURL = `${urlobject.host}${urlobject.pathname}`

    if(fullURL.slice(0, -1) === "/"){
        fullURL = fullURL.slice(0, -1)
    }

    return fullURL
}


function getH1fromHTML(html: string): string{
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



function getFirstParagraphfromHTML(html: string): string{
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



function getURlsfromhtml(html: string, baseURL: string){
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


function ExtractedPage({
  html,
  pageURL,
}: {
  html: string;
  pageURL: string;
}) {
  return {
    url: pageURL,
    h1: getH1fromHTML(html),
    first_paragraph: getFirstParagraphfromHTML(html),
    outgoing_links: getURlsfromhtml(html, pageURL),
  };
}



async function getHTML(url: string): Promise<string | null> {
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



async function crawlPage(
  baseURL: string,
  currentURL: string,
  pages: Record<string, any>,
) {
  const base = new URL(baseURL);
  const current = new URL(currentURL);

  if (base.hostname !== current.hostname) return pages;

  const normalizedURL = NormalizeURls(currentURL);
  if (pages[normalizedURL]) return pages;

  const html = await getHTML(currentURL);

  pages[normalizedURL] = ExtractedPage({
    html,
    pageURL: currentURL,
  });

  const nextURLs = getURlsfromhtml(html, baseURL);
  for (const nextURL of nextURLs) {
    await crawlPage(baseURL, nextURL, pages);
  }

  return pages;
}



function CSVEscape(field: string) {
  const str = field ?? "";
  const needsQuoting = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}


function writeCSVReport(pageData: Record<string, any>, filename = "report.csv"): void {
  const fs = require("fs");
  const path = require("path");

  const headers = [
    "page_url",
    "h1",
    "first_paragraph",
    "outgoing_link_urls",
    "image_urls",
  ];

  const rows: string[] = [headers.join(",")];

  for (const page of Object.values(pageData)) {
    const row = [
      CSVEscape(page.url),
      CSVEscape(page.h1),
      CSVEscape(page.first_paragraph),
      CSVEscape(page.outgoing_links.join(";")),
    ];

    rows.push(row.join(","));
  }

  const filePath = path.resolve(process.cwd(), filename);
  fs.writeFileSync(filePath, rows.join("\n"), "utf-8");
}



async function main(){
    const baseURL = 'https://www.nike.com/w/shop-your-store-8b4bh'
    const pages = {}

    await crawlPage(baseURL, baseURL, pages)


    writeCSVReport(pages)
    console.log("report generated")
}

main()