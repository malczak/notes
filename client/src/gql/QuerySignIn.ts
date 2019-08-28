export default `
    query QuerySignIn($passwd: String) {
        signIn(passwd: $passwd)
    }
`;
