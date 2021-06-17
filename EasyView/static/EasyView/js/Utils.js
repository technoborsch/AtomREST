/**
 * Function that adds spacing to a given string, so that in each line there is no more symbols than maxLength.
 *
 * @param {string} text Text that should be prettified
 * @param {number} maxLength Maximum number of symbols in each line
 * @return {string} String with inserted spacings
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
 * @param {string} text Text that should be truncated
 * @param {number} length Maximum length of string
 * @return {string} truncated string
 */
export function truncate(text, length) {
    if (text.length - 3 <= length) {
        throw 'Length of given text should be more than given length'
    }
    return text.slice(0, length - 3) + '...'
}
