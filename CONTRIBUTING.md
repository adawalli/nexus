# Contributing to Nexus

Thank you for your interest in contributing to Nexus! We welcome contributions from developers of all experience levels.

## Getting Started

### Prerequisites

- Bun (latest)
- Node.js 18+ (for building dist/)
- Git

### Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/nexus-mcp.git
   cd nexus-mcp
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment**

   ```bash
   cp .env.example .env
   # Add your OpenRouter API key to .env
   ```

4. **Run the development server**

   ```bash
   bun run dev
   ```

5. **Run tests**
   ```bash
   bun run test
   ```

## Development Workflow

### Scripts Available

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run test` - Run test suite
- `bun run test:watch` - Run tests in watch mode
- `bun run lint` - Check code quality
- `bun run format` - Format code with Prettier
- `bun run type-check` - TypeScript type checking

### Code Quality

We maintain high code quality standards:

- **TypeScript**: All code must be properly typed
- **ESLint**: Code must pass linting checks
- **Prettier**: Code must be formatted consistently
- **Tests**: New features require test coverage
- **Documentation**: Public APIs must be documented

## Making Contributions

### Types of Contributions

We welcome several types of contributions:

- **Bug fixes**: Help us fix issues and improve stability
- **Features**: Add new functionality or enhance existing features
- **Documentation**: Improve docs, examples, and guides
- **Tests**: Increase test coverage and quality
- **Performance**: Optimize code and reduce resource usage

### Before You Start

1. **Check existing issues**: Look for related issues or discussions
2. **Create an issue**: For large changes, create an issue to discuss the approach
3. **Follow conventions**: Review our code style and patterns
4. **Write tests**: Include tests for new functionality

### Pull Request Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

3. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Follow [Conventional Commits](https://conventionalcommits.org/) format:
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation changes
   - `test:` Test additions or updates
   - `refactor:` Code refactoring
   - `perf:` Performance improvements

4. **Push and create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Fill out the PR template**
   - Describe what changes you made
   - Link any related issues
   - Include testing instructions
   - Add screenshots if applicable

## Code Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use proper typing for function parameters and returns
- Avoid `any` type except when absolutely necessary

### Code Style

- Use descriptive variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Use async/await instead of Promises.then()
- Handle errors appropriately

### Testing

- Write unit tests for all utility functions
- Include integration tests for MCP functionality
- Use descriptive test names
- Test both success and error cases
- Aim for high test coverage

### Documentation

- Use JSDoc comments for public APIs
- Update README.md for user-facing changes
- Include code examples in documentation
- Keep documentation current with code changes

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Detailed steps to recreate the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: OS, Node version, MCP client
- **Logs**: Relevant error messages or logs

### Feature Requests

For feature requests, please include:

- **Use case**: Why is this feature needed?
- **Description**: Detailed description of the feature
- **Alternatives**: Other solutions you've considered
- **Implementation**: Any ideas for implementation

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on what's best for the community
- Show empathy towards other community members

### Communication

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Requests**: For code contributions and reviews

### Getting Help

If you need help:

1. Check the documentation and examples
2. Search existing issues and discussions
3. Ask questions in GitHub Discussions
4. Reach out to maintainers if needed

## Recognition

We value all contributions and will:

- Add your name to the contributors list
- Mention significant contributions in release notes
- Provide feedback and support for your contributions
- Consider you for maintainer role based on ongoing involvement

## Release Process

Releases follow semantic versioning:

- **Patch**: Bug fixes and small improvements
- **Minor**: New features that don't break existing APIs
- **Major**: Breaking changes

Releases are automated based on conventional commit messages.

## License

By contributing to Nexus, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Nexus! Your involvement helps make AI integration simpler for developers everywhere.
