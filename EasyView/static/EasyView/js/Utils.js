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
        })
        stringsArray.push( string );
        const joinedStringsArray = [];
        stringsArray.forEach(( string ) => {
            joinedStringsArray.push( string.join( space ) );
        })

        return joinedStringsArray.join('\n');
    }

