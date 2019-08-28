export default `
    mutation MutationDeleteFile($id: String!) {
        deleteFile(id: $id) {
            id
        }
    }
`;
