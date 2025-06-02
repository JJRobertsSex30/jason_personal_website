const googlePlay = new Proxy({"src":"/_astro/google-play.ISTMcpLO.png","width":300,"height":89,"format":"png"}, {
						get(target, name, receiver) {
							if (name === 'clone') {
								return structuredClone(target);
							}
							if (name === 'fsPath') {
								return "C:/Dev/jason_personal_website/src/assets/images/google-play.png";
							}
							
							return target[name];
						}
					});

export { googlePlay as default };
