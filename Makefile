all:
	@cp lib/zest.js .
	@uglifyjs -o zest.min.js zest.js

ender:
	@cat lib/zest.js ext/zest.ender.js > zest.js
	@uglifyjs -o zest.min.js zest.js

jquery:
	@cat lib/zest.js ext/zest.jquery.js > zest.js
	@uglifyjs -o zest.min.js zest.js

prototype:
	@cat lib/zest.js ext/zest.prototype.js > zest.js
	@uglifyjs -o zest.min.js zest.js

zepto:
	@cat lib/zest.js ext/zest.zepto.js > zest.js
	@uglifyjs -o zest.min.js zest.js

clean:
	@rm zest.js
	@rm zest.min.js

.PHONY: all clean ender jquery prototype zepto
