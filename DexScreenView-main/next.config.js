module.exports = {
	webpack(config) {
		config.module.rules.push({
			test: /\.svg$/,
			use: ["@svgr/webpack"]
		});
		return config;
	},
	env: {
		serverUrl: process.env.SERVER_URL,
	},
};
