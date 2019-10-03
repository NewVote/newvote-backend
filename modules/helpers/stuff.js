function createSlug(string) {
    return string
        .replace(/(?:(the|a|an) +)/g, '') // remove articles
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-') // collapse dashes
        .replace(/^-+/, '') // trim - from start of text
        .replace(/-+$/, '') // trim - from end of text
}

module.exports = createSlug;
