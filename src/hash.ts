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

export function objectStringify( obj: any, sort: boolean, visited: Set<any> ): string
{
    if( typeof obj === 'undefined' ){ return '' }
    if( typeof obj !== 'object' || obj === null ){ return JSON.stringify( obj )}
    if( obj instanceof Function ){ return getIndexHash( obj )}
    if( obj instanceof Date ){ return obj.toISOString()}
    if( obj instanceof RegExp ){ return obj.toString()}
    if( obj instanceof Set ){ return objectStringify([...obj], true, visited )}
    if( obj instanceof Map ){ return objectStringify( Object.fromEntries([...obj.entries()]), true, visited )}

    if( visited.has( obj )){ return '*Circular*' } visited.add( obj );

    if( Array.isArray( obj ))
    {
        const arr = obj.map( v => objectStringify( v, sort, visited )); sort && arr.sort();

        return `[${ arr.join(',') }]`;
    }
    if( obj.constructor !== Object ){ return getIndexHash( obj )}

    const pairs = Object.keys( obj ).sort().map( key => `${ JSON.stringify( key ) }:${ objectStringify( obj[key], sort, visited )}`);

    return `{${ pairs.join(',') }}`;
}

export default function objectHash( obj: any ): string
{
    const [ h2, h1 ] = cyrb64( objectStringify( obj, false, new Set() ), 0 );
    return h2.toString(36).padStart( 7, '0' ) + h1.toString(36).padStart( 7, '0' );
}