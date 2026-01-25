export function NormalizeURLS(url: string){
    const urlobject = new URL(url)
    let fullURL = `${urlobject.host}${urlobject.pathname}`
}