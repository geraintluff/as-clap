export const MAX_CSTRING_LENGTH = 8192;
export const MAX_FEATURE_COUNT = 100;

@inline export function getCStringN(ptr: usize, maxLength: usize) : string {
	return String.UTF8.decodeUnsafe(ptr, maxLength, true);
}
export function setCStringN(str: string, ptr: usize, length: i32) : void {
	let bytes = String.UTF8.byteLength(str, true);
	while (bytes > length) {
		let extra = bytes - length;
		str = str.substring(0, str.length - extra); // trim off a bit
		bytes = String.UTF8.byteLength(str, true);
	}
	String.UTF8.encodeUnsafe(changetype<usize>(str), str.length, ptr, true);
	// Fill the rest with 0
	while (bytes < length) {
		store<u8>(ptr + bytes, 0);
		++bytes;
	}
}

//---- `@property` types and methods ----//

// @property methods to translate a `string` into C-style UTF8 `char *`
export type CString = string;
@inline export function getCString(ptr: usize): string {
	return getCStringN(ptr, MAX_CSTRING_LENGTH);
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
@inline export function setCString256(str: string, first: usize) : usize {
	setCStringN(str, first, 256)
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

// Pointer to (or array of) simple values
@unmanaged @final
export class CNumPtr<T> {
	@inline @operator("[]") get(i: usize) : T {
		return load<T>(changetype<usize>(this) + sizeof<T>()*i);
	}
	@inline @operator("[]=") set(i: usize, v: T) : T {
		store<T>(changetype<usize>(this) + sizeof<T>()*i, v);
		return v;
	}
}
@inline export function getCNumPtr<T>(ptr : usize) : CNumPtr<T> {
	return changetype<CNumPtr<T>>(ptr);
}

// Pointer to (or array of) values which are objects in AssemblyScript, so we return them as a pointer
@unmanaged @final
export class CObjPtr<T> {
	@inline @operator("[]") get(i: usize) : T {
		return changetype<T>(changetype<usize>(this) + offsetof<T>()*i);
	}
}
@inline export function getCObjPtr<T>(ptr : usize) : CObjPtr<T> {
	return changetype<CObjPtr<T>>(ptr);
}

// Pointer to (or array of) pointers, which should be interpreted as T, some @unmanaged AssemblyScript class
@unmanaged @final
export class CPtrPtr<T> {
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
@inline export function getCPtrPtr<T>(ptr : usize) : CPtrPtr<T> {
	return changetype<CPtrPtr<T>>(ptr);
}
