const imgBookCover = new Proxy({"src":"/_astro/book_thin.Bk7EqcTe.png","width":2701,"height":2887,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/Dev/jason_personal_website/src/assets/images/book_thin.png";
							}
							
							return target[name];
						}
					});

export { imgBookCover as default };
