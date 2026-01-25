export function NormalizeURLS(url: string){
    const urlobject = new URL(url)
    let fullURL = `${urlobject.host}${urlobject.pathname}`

    if(fullURL.slice(0, -1) === "/"){
        fullURL = fullURL.slice(0, -1)
    }

    return fullURL
}