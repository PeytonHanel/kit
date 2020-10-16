import { IncomingRequest, RenderOptions, ServerRouteManifest } from '../types';

export default function render_route(
	request: IncomingRequest,
	options: RenderOptions
) {
	const route: ServerRouteManifest = options.manifest.server_routes.find(route => route.pattern.test(request.path));
	if (!route) return;

	return options.load(route).then(async mod => {
		const handler = mod[request.method.toLowerCase().replace('delete', 'del')]; // 'delete' is a reserved word

		const session = {}; // TODO

		if (handler) {
			const params = {};
			const match = route.pattern.exec(request.path);
			route.params.forEach((name, i) => {
				params[name] = match[i + 1]
			});

			try {
				let {
					status = 200,
					body,
					headers = {}
				} = await handler({
					host: request.host,
					path: request.path,
					query: request.query,
					params
				}, session);

				headers = lowercase_keys(headers);

				if (typeof body === 'object' && !('content-type' in headers) || headers['content-type'] === 'application/json') {
					headers = { ...headers, 'content-type': 'application/json' };
					body = JSON.stringify(body);
				}

				return { status, body, headers };
			} catch (err) {
				return {
					status: 500,
					body: err.message
				};
			}
		} else {
			return {
				status: 501,
				body: `${request.method} is not implemented for ${request.path}`
			};
		}
	});
}

function lowercase_keys(obj) {
	const clone = {};
	for (const key in obj) {
		clone[key.toLowerCase()] = obj[key];
	}
	return clone;
}