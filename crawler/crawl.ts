const {NormalizeURLS} = await import("./normalize")
class Espionage{
    baseURL: string;
    currentURL: string;
    pages: Record<string, any>
    constructor(baseURL: string, currentURL: string, pages: any){
        this.baseURL = baseURL;
        this.currentURL = currentURL;
        this.pages = pages

        const base = new URL(baseURL)
        const current = new URL(currentURL)

        if(base.hostname !== current.hostname) return pages

        const normalizedURL = NormalizeURLS(currentURL)
        if(pages[normalizedURL]) return pages
    }
}

module.exports = Espionage;