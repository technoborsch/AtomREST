/**
 * Function that adds spacing to a given string, so that in each line there is no more symbols than maxLength.
 *
 * @param { String } text Text that should be prettified
 * @param { Number } maxLength Maximum number of symbols in each line
 * @return { String } String with inserted spacings
 */
export function prettify ( text, maxLength ) {
        const space = ' ';
        let wordsArray = text.split(space);
        let stringsArray = [];
        let string = [];
        let lettersCounter = 0;

        wordsArray.forEach(( word ) => {
            lettersCounter += word.length;
            if ( lettersCounter > maxLength ) {
                stringsArray.push( string );
                string = [];
                lettersCounter = word.length;
            }
            string.push( word );
        });
        stringsArray.push( string );
        const joinedStringsArray = [];
        stringsArray.forEach(( string ) => {
            joinedStringsArray.push( string.join( space ) );
        });

        return joinedStringsArray.join('\n');
    }

/**
 * Function that truncates a string to a given number of signs and adds '...' at the end of it.
 *
 * @param { String } text Text that should be truncated
 * @param { Number } length Maximum length of string
 * @return { String } truncated string
 */
export function truncate(text, length) {
    if (length <= 3) {
        throw 'ValueError: too small length value';
    }
    if (text.length >= length) {
        return text.slice(0, length - 3) + '...';
    }
    return text;
}
