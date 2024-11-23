# Contributing to PandaChat 🐼

First off, thanks for taking the time to contribute! 🎉

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Styleguides](#styleguides)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/pandachat.git
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/Razee4315/pandachat.git
   ```
4. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Process

1. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

2. Create your `.env` file from `.env.example`

3. Start the development server:
   ```bash
   npm run dev
   # or
   bun run dev
   ```

4. Make your changes and test thoroughly

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Update the documentation with details of any changes to the interface
3. Ensure your code follows our style guidelines
4. Create a Pull Request with a comprehensive description of changes

## Styleguides

### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### TypeScript Styleguide
- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable names
- Add comments for complex logic
- Use proper typing, avoid `any`

### React Component Styleguide
- Use functional components with hooks
- Keep components small and focused
- Use proper prop typing
- Follow the container/presenter pattern
- Use CSS modules or Tailwind for styling

### Testing
- Write tests for new features
- Ensure all tests pass before submitting PR
- Follow existing test patterns
- Include both unit and integration tests where appropriate

## Community

- Join our [Discord server](https://discord.gg/pandachat) for discussions
- Follow us on [Twitter](https://twitter.com/pandachat)
- Report bugs via [GitHub Issues](https://github.com/Razee4315/pandachat/issues)

## Recognition

Contributors who make significant improvements will be added to our [Contributors](https://github.com/Razee4315/pandachat#contributors) section in the README.

Thank you for contributing to PandaChat! 🎉
