// From https://github.com/django/django/blob/b9cf764be62e77b4777b3a75ec256f6209a57671/django/contrib/admin/static/admin/js/urlify.js

let removeList = [
    'a', 'an', 'as', 'at', 'before', 'but', 'by', 'for', 'from',
    'is', 'in', 'into', 'like', 'of', 'off', 'on', 'onto', 'per',
    'since', 'than', 'the', 'this', 'that', 'to', 'up', 'via',
    'with'
];

let r = new RegExp('\\b(' + removeList.join('|') + ')\\b', 'gi');

function createSlug(string) {
    let newstring = string
        .replace(r, '') // remove articles
        .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-') // collapse dashes
        .replace(/^-+/, '') // trim - from start of text
        .replace(/-+$/, '') // trim - from end of text

    return newstring.toLowerCase();
}

module.exports = createSlug;
