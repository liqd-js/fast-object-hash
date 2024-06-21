const HashIndex = new WeakMap<Function | object, string>();

const randomID = () => Date.now() + Math.floor( Math.random() * ( 2**52 ));

function cyrb64( str: string, seed: number = 0 )
{
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;

    for( let i = 0, ch; i < str.length; ++i )
    {
        ch = str.charCodeAt(i);
        h1 = Math.imul( h1 ^ ch, 2654435761 );
        h2 = Math.imul( h2 ^ ch, 1597334677 );
    }

    h1  = Math.imul( h1 ^ ( h1 >>> 16 ), 2246822507 );
    h1 ^= Math.imul( h2 ^ ( h2 >>> 13 ), 3266489909 );
    h2  = Math.imul( h2 ^ ( h2 >>> 16 ), 2246822507 );
    h2 ^= Math.imul( h1 ^ ( h1 >>> 13 ), 3266489909 );
    
    return [ h2>>>0, h1>>>0 ];
};

function getIndexHash( val: Function | object ): string
{
    if( !HashIndex.has( val ))
    {
        HashIndex.set( val, ( val instanceof Function ? 'function ' + val.name : 'instance ' + val.constructor.name ) + '_' + randomID());
    }

    return HashIndex.get( val )!;
}

function compare( a: any, b: any )
{
    return a === b ? 0 : a > b ? 1 : -1;
}

function compareKeys( a: any[], b: any[] )
{
    return a[0] === b[0] ? 0 : a[0] > b[0] ? 1 : -1;
}

type ObjectStringifyOptions = 
{
    sortArrays: boolean,
    ignoreUndefinedProperties: boolean,
    toString?: ( obj: object ) => string | undefined
};

function _objectStringify( obj: any, visited: Set<any>, options: ObjectStringifyOptions ): string
{
    if( typeof obj === 'undefined' ){ return '' }
    if( typeof obj !== 'object' || obj === null ){ return JSON.stringify( obj )}
    if( obj instanceof Function ){ return getIndexHash( obj )}
    if( obj instanceof Date ){ return obj.toISOString()}
    if( obj instanceof RegExp ){ return obj.toString()}
    if( obj instanceof Set )
    { 
        return 'Set(' + [...obj].sort( compare ).map(( v: any ) => _objectStringify( v, visited, options )).join(',') + ')';
    }
    if( obj instanceof Map )
    {
        return 'Map(' + [...obj.entries()].sort( compareKeys )
            .map(([ key, value ]) => 
                `${ JSON.stringify( key ) }:${ _objectStringify( value, visited, options )}`)
            .join(',') + ')';
    }
    if( options.toString )
    {
        const str = options.toString( obj );

        if( str !== undefined ){ return str }
    }

    if( visited.has( obj )){ return '*Circular*' } visited.add( obj );

    if( Array.isArray( obj ))
    {
        if( options.sortArrays ){ obj = obj.slice(0).sort( compare ) }

        return '[' + obj.map(( v: any ) => _objectStringify( v, visited, options )).join(',') + ']';
    }
    if( obj.constructor !== Object ){ return getIndexHash( obj )}

    let keys = Object.keys( obj );

    options.ignoreUndefinedProperties && ( keys = keys.filter( key => obj[key] !== undefined ));

    return '{' + keys.sort( compare ).map( key => `${ JSON.stringify( key ) }:${ _objectStringify( obj[key], visited, options )}`).join(',') + '}' ;
}

export function objectStringify( obj: any, options: Partial<ObjectStringifyOptions> = {}): string
{
    const { sortArrays = false, ignoreUndefinedProperties = true, toString } = options;

    return _objectStringify( obj, new Set(), { sortArrays, ignoreUndefinedProperties, toString });
}
 
export default function objectHash( obj: any, options: Partial<ObjectStringifyOptions> = {}): string
{
    const { sortArrays = false, ignoreUndefinedProperties = true, toString } = options;

    const [ h2, h1 ] = cyrb64( _objectStringify( obj, new Set(), { sortArrays, ignoreUndefinedProperties, toString }), 0 );
    return h2.toString(36).padStart( 7, '0' ) + h1.toString(36).padStart( 7, '0' );
}