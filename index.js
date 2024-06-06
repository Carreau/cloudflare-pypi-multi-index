import { Router } from 'itty-router';

const PYPI_URL = 'https://pypi.org/simple/';
const NIGHTLY_MIRROR = [
	{
		mirror: 'https://pypi.anaconda.org/scientific-python-nightly-wheels/simple/',
		root: 'https://pypi.anaconda.org',
	},
];
// Create a new router
const router = Router();

router.get('/', () => {
	return new Response('See <a href="/nightly/">/nightly/</a>');
});

router.get('/nightly/', () => {
	return new Response(
		'A virtual PyPI index for nightly - pip install --index-url URL --pre --upgrade PACKAGES'
	);
});

/*
This route demonstrates path parameters, allowing you to extract fragments from the request
URL.

Try visit /example/hello and see the response.
*/
router.get('/nightly/:package', async ({ params }) => {
	// Decode text like "Hello%20world" into "Hello world"
	let input = decodeURIComponent(params.package);

	return await handleSimple(params.package);

	const response = await fetch(PYPI_URL + input);
	const body = await response.text();
	return new Response(body, {
		headers: { 'Content-Type': 'text/html' },
	});
});

async function handleSimple(packageName) {
	let fixedNightly = [];
	let tmp = [];
	if (packageName.endsWith('.ico')) {
		return;
	}

	console.log('!!fixed nightly', fixedNightly);

	const pypiResponse = await fetch(`${PYPI_URL}${packageName}`);
	const pypiBody = await pypiResponse.text();
	const source_rewriter = new HTMLRewriter().on('body', {
		async element(outer_element) {
			console.log('Source body:', outer_element);
			for (const { mirror, root } of NIGHTLY_MIRROR) {
				const url = `${mirror}${packageName}`;
				console.log('fetching', url);

				const mirrorResponse = await fetch(url);
				const mirrorBody = await mirrorResponse.text();

				const rewriter = new HTMLRewriter().on('a', {
					element(inner_element) {
						const href = inner_element.getAttribute('href');

						console.log('inner_element', inner_element, href, `${inner_element}`);

						if (href && href.startsWith('/')) {
							const newHref = root + href;
							const parts = href.split('/');
							const lastPart = parts[parts.length - 1];
							const linkHtml = `<a href="${newHref}">${lastPart}</a>`;
							outer_element.append(linkHtml, { html: Boolean });
						}
					},
					text(text) {
						console.log('handler got text', text);
					},
				});
				await rewriter.transform(new Response(mirrorBody)).text();
			}
		},
	});

	const res = await source_rewriter.transform(new Response(pypiBody)).text();

	//	let combinedBody = pypiBody;
	//
	//	for (const nightlyElement of fixedNightly) {
	//		combinedBody = combinedBody.replace('</body>', nightlyElement + '</body>');
	//	}

	return new Response(res, {
		headers: { 'Content-Type': 'text/html' },
	});
}
/*
This is the last route we define, it will match anything that hasn't hit a route we've defined
above, therefore it's useful as a 404 (and avoids us hitting worker exceptions, so make sure to include it!).

Visit any page that doesn't exist (e.g. /foobar) to see it in action.
*/
router.all('*', () => new Response('404, not found!', { status: 404 }));

export default {
	fetch: router.handle,
};
