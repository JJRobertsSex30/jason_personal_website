const imgAboutJJ = new Proxy({"src":"/_astro/jj_upscale.DC0SNn5_.jpg","width":1200,"height":896,"format":"jpg"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/Dev/jason_personal_website/src/assets/images/jj_upscale.jpg";
							}
							
							return target[name];
						}
					});

export { imgAboutJJ as default };
