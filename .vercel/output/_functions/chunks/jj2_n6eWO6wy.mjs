const imgHeroMain = new Proxy({"src":"/_astro/jj2.BaqRYc3m.png","width":2816,"height":2112,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/Dev/jason_personal_website/src/assets/images/jj2.png";
							}
							
							return target[name];
						}
					});

export { imgHeroMain as default };
