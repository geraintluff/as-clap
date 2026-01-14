export const MAX_CSTRING_LENGTH = 8192;
export const MAX_FEATURE_COUNT = 100;

//---- `@property` types and methods ----//

// @property methods to translate a `string` into C-style UTF8 `char *`
export type CString = string;
@inline export function getCString(ptr: usize): string {
	return String.UTF8.decodeUnsafe(ptr, MAX_CSTRING_LENGTH, true);
}
export function setCString(str: string, ptr: usize): usize {
	if (ptr != 0) heap.free(ptr); // free previous string
	let bytes = String.UTF8.byteLength(str, true);
	ptr = heap.alloc(bytes);
	String.UTF8.encodeUnsafe(changetype<usize>(str), str.length, ptr, true);
	return ptr;
}
export type CStringNullable = string | null;
@inline export function getCStringNullable(ptr: usize): string | null {
	if (ptr == 0) return null;
	return String.UTF8.decodeUnsafe(ptr, MAX_CSTRING_LENGTH, true);
}
@inline export function setCStringNullable(str: string | null, ptr: usize): usize {
	if (ptr != 0) heap.free(ptr); // free previous string
	if (str == null) return 0;
	return setCString(str as string, ptr);
}

// Fixed-size string
export type CString256 = string;
@inline export function getCString256(first: usize) : string {
	return String.UTF8.decodeUnsafe(first, 256, true);
}
@inline export function setCString256(str : string, first: usize) : usize {
	let bytes = String.UTF8.byteLength(str, true);
	while (bytes > 256) str = str.substring(0, str.length - 1); // keep trimming until it fits
	String.UTF8.encodeUnsafe(changetype<usize>(str), str.length, first, true);
	return first; // the same
}

export type Renamed<T> = T;
@inline export function getRenamed<T>(v: T): T {
	return v;
}
@inline export function setRenamed<T>(v: T, prev: T): T {
	return v;
}

export type NullablePtr<Obj> = Obj | null;
@inline export function getNullablePtr<Obj>(ptr: usize): Obj | null {
	if (ptr == 0) return null;
	return changetype<Obj>(ptr);
}
@inline export function setNullablePtr<Obj>(v: Obj | null, prev: usize): usize {
	if (v == null) return 0;
	return changetype<usize>(v);
}

//---- Classes for re-interpreting C-style arrays (pointers) ----//

// Contiguous array of simple values
@unmanaged @final
export class CNumArray<T> {
	@inline @operator("[]") get(i: usize) : T {
		return load<T>(changetype<usize>(this) + sizeof<T>()*i);
	}
	@inline @operator("[]=") set(i: usize, v: T) : T {
		store<T>(changetype<usize>(this) + sizeof<T>()*i, v);
		return v;
	}
}
@inline export function getCNumArray<T>(ptr : usize) : CNumArray<T> {
	return changetype<CNumArray<T>>(ptr);
}

// Contiguous array of objects/structs
@unmanaged @final
export class CObjArray<T> {
	@inline @operator("[]") get(i: usize) : T {
		return changetype<T>(changetype<usize>(this) + offsetof<T>()*i);
	}
}
@inline export function getCObjArray<T>(ptr : usize) : CObjArray<T> {
	return changetype<CObjArray<T>>(ptr);
}

// Contiguous array of pointers to objects
@unmanaged @final
export class CPtrArray<T> {
	@inline @operator("[]") get(i: usize) : T {
		let ptr = changetype<usize>(this) + sizeof<usize>()*i;
		return changetype<T>(load<usize>(ptr));
	}
	@inline @operator("[]=") set(i: usize, v : T) : T {
		let ptr = changetype<usize>(this) + sizeof<usize>()*i;
		store<usize>(ptr, changetype<usize>(v));
		return v;
	}
}
@inline export function getCPtrArray<T>(ptr : usize) : CPtrArray<T> {
	return changetype<CPtrArray<T>>(ptr);
}
