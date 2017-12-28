ROLLUP=node_modules/.bin/rollup

theda.umd.js: theda.js
	$(ROLLUP) -o $@ -c rollup.config.js -f umd -n theda theda.js

clean:
	@rm theda.umd.js
.PHONY: clean

serve:
	http-server -p 8043
.PHONY: serve

watch:
	find theda.js | entr make theda.umd.js
.PHONY: watch

dev:
	make serve & make watch
.PHONY: dev
