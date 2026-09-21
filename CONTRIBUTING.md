# Contributing to Local Data Architect

First off, thank you for considering contributing to Local Data Architect! 

### 1. Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](../../issues) first. If it doesn't exist, go ahead and create one!

### 2. Fork & create a branch

If this is something you think you can fix, then fork Local Data Architect and create a branch with a descriptive name.

### 3. Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

### 4. Code Standards
- We strictly use **TypeScript**.
- The backend relies on **DuckDB** native integration.
- The UI follows a strict **Minimalist SaaS** design. Ensure you use the CSS variables defined in `globals.css` rather than hardcoding arbitrary colors.

### 5. Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with Local Data Architect's master branch:

```sh
git remote add upstream https://github.com/Gameroy246/PLatform.git
git checkout master
git pull upstream master
```

Then update your feature branch from your local copy of master, and push it! Finally, go to GitHub and make a Pull Request.
