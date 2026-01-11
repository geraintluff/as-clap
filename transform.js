import * as assemblyscript from "assemblyscript"
import { Transform } from "assemblyscript/transform"

import * as fs from "node:fs"

let Node = assemblyscript.Node;
let NodeKind = assemblyscript.NodeKind;
let ClassDeclaration = assemblyscript.ClassDeclaration;
let CommonFlags = assemblyscript.CommonFlags;
let Parser = assemblyscript.Parser;

function isNode(v) {
	return typeof v?.kind == 'number';
}

function walkAst(node, callbackFn) {
	callbackFn(node);
	for (let key in node) {
		let prop = node[key];
		if (isNode(prop)) {
			walkAst(prop, callbackFn);
		} else if (Array.isArray(prop) && isNode(prop[0])) {
			prop.forEach(n => walkAst(n, callbackFn));
		}
	}
}

function getSource(node) {
	return node.range.source.text.substring(node.range.start, node.range.end);
}

/* A decorated class member like:

	class MyClass {
		@property
		proxyMember: ProxyType = rawExpr
	}

will be replaced by accessors which translates to/from a friendlier type

	class MyClass {
		@property
		get proxyMember(): ProxyType {
			return getProxyType(rawExpr);
		}
		set proxyMember(v: ProxyType) {
			rawExpr = setProxyType(v, rawExpr);
		}
	}

Assuming the following are in scope:

	getProxyType(raw: RawType): ProxyType {...}
	setProxyType(v: ProxyType, raw: RawType): RawType {...}
 */
function replaceProperties(classDeclaration) {
	let changed = false;
	for (let i = 0; i < classDeclaration.members.length; ++i) {
		let member = classDeclaration.members[i];
		
		if (member.decorators?.[0]?.name?.text == "property") {
			let name = member.name.text;
			let type = getSource(member.type);
			let init = getSource(member.initializer);
			
			let dummyCode = `class ${classDeclaration.name.text} {
				@inline get ${name}() : ${type} {
					return get${type}(${init});
				}
				@inline set ${name}(v : ${type}) {
					${init} = set${type}(v, ${init});
				}
			}`;
			let parser = new Parser();
			parser.parseFile(dummyCode, "property.ts", false);
			let dummyClass = parser.currentSource.statements[0];
			let dummyMembers = dummyClass.members;

			if (member.flags&CommonFlags.Readonly) dummyMembers.pop(); // remove setter for read-only properties

			for (let m of dummyMembers) {
				// Assign the original range to all the expressions
				walkAst(m, n => n.range = member.range);
			}
			classDeclaration.members.splice(i, 1, ...dummyMembers);
			changed = true;
		}
	}
	return changed;
}

/* Fixed length arrays:

	@array(16) foo: u8

becomes:

	foo: usize // pointer, with a custom getter
	foo0: u8; foo1: u8, ... foo15: u8
*/
function replaceArrays(classDeclaration) {
	let changed = false;
	for (let i = 0; i < classDeclaration.members.length; ++i) {
		let member = classDeclaration.members[i];
		
		if (member.decorators?.[0]?.name?.text == "array") {
			let decorator = member.decorators[0];
			let countArg = parseInt(getSource(decorator.args?.[0]), 10);
			let name = member.name.text;

			let dummyCode = `class ${classDeclaration.name.text} {
				@inline get ${name}() : usize {
					return changetype<usize>(this) + offsetof<${classDeclaration.name.text}>(${JSON.stringify(name + "0")});
				}
				@inline set ${name}(v : usize) {
					assert(v == changetype<usize>(this) + offsetof<${classDeclaration.name.text}>(${JSON.stringify(name + "0")}), "assignment can't actually change values");
				}
			}`;
			let parser = new Parser();
			parser.parseFile(dummyCode, "array-pointer.ts", false);
			let dummyClass = parser.currentSource.statements[0];
			let replacements = dummyClass.members;

			walkAst(replacements, n => n.range = member.range);

			for (let i = 0; i < countArg; ++i) {
				let name = Node.createIdentifierExpression(member.name.text + i, member.name.range, member.name.quoted);
				let field = Node.createFieldDeclaration(
					name,
					null/*decorators*/,
					member.flags,
					member.type,
					member.initializer,
					member.range
				);
				replacements.push(field);
			}
			
			classDeclaration.members.splice(i, 1, ...replacements);
			changed = true;
		}
	}
	return changed;
}
class WclapTransform extends Transform {
	afterParse(parsed) {
		console.log("Applying @property and @array transforms");

		parsed.sources.forEach(source => {
			if (/^~lib\//.test(source.normalizedPath)) return;

			let changed = true;
			walkAst(source, node => {
				if (node.kind == NodeKind.ClassDeclaration) {
					if (replaceProperties(node)) changed = true;
					if (replaceArrays(node)) changed = true;
				}
			});
			let transformedPath = "./transformed/" + source.normalizedPath;
			let transformedCode = assemblyscript.ASTBuilder.build(source);
			console.log(source.normalizedPath, transformedPath);
			fs.writeFileSync(transformedPath, transformedCode);
		});
	}
}
export default WclapTransform;
