all:
	@cp lib/zest.js .
	@uglifyjs -o zest.min.js zest.js

clean:
	@rm zest.js
	@rm zest.min.js

.PHONY: clean all
