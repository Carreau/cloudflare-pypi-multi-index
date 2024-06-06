import { Router } from 'itty-router';

const PYPI_URL = "https://pypi.org/simple/";
const NIGHTLY_MIRROR = [
    {
        mirror: "https://pypi.anaconda.org/scientific-python-nightly-wheels/simple/",
        root: "https://pypi.anaconda.org"
    }
];
// Create a new router
const router = Router();

/*
Our index route, a simple hello world.
*/
router.get('/', () => {
	return new Response('Hello, world! This is the root page of your Worker template.');
});

/*
This route demonstrates path parameters, allowing you to extract fragments from the request
URL.

Try visit /example/hello and see the response.
*/
router.get('/:package', async ({ params }) => {
	// Decode text like "Hello%20world" into "Hello world"
	let input = decodeURIComponent(params.package);

	return await handleSimple(params.package);

	const response = await fetch(PYPI_URL+input);
  const body = await response.text();
  return new Response(body, {
      headers: { 'Content-Type': 'text/html' }
  });

});


async function handleSimple(packageName) {
    let fixedNightly = [];
		if (packageName.endsWith('.ico') ){
			return
		}
    for (const { mirror, root } of NIGHTLY_MIRROR) {
				const url = `${mirror}${packageName}`
			  console.log('fetching', url)

        const mirrorResponse = await fetch(url);
        const mirrorBody = await mirrorResponse.text();

        const rewriter = new HTMLRewriter()
            .on('a', {
                element(element) {
                    const href = element.getAttribute('href');

										console.log('element', element, href)
                    if (href && href.startsWith('/')) {
												const newHref = root + href;
												let linkHtml = `<a href="${newHref}">`;
                        element.setInnerContent(innerContent => {
														console.log('inner contnetn', innerContent)
                            linkHtml += innerContent +'Dev debug';
                        });
                        element.onEndTag(tag => {
                            linkHtml += 'Dev debug</a>';
                            fixedNightly.push(linkHtml);
                        });
                        element.setAttribute('href', root + href);


                        //fixedNightly.push(element);
                        // Push the modified link HTML to fixedNightly array

                    }
                }
            });
        await rewriter.transform(new Response(mirrorBody)).text();
    }

		console.log('!!fixed nightly',fixedNightly);

    const pypiResponse = await fetch(`${PYPI_URL}${packageName}`);
    const pypiBody = await pypiResponse.text();
    let combinedBody = pypiBody;

    for (const nightlyElement of fixedNightly) {
        combinedBody = combinedBody.replace('</body>', nightlyElement + '</body>');
    }

    return new Response(combinedBody, {
        headers: { 'Content-Type': 'text/html' }
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
