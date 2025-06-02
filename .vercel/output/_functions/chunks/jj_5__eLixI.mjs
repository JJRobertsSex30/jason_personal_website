const imgHeroMain = new Proxy({"src":"/_astro/jj.CTZ_U7d-.jpg","width":514,"height":341,"format":"jpg"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/Dev/jason_personal_website/src/assets/images/jj.jpg";
							}
							
							return target[name];
						}
					});

export { imgHeroMain as default };
