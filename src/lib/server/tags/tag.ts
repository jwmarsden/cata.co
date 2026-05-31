export class Tag {
	name: string;
	occurrences: number;
	instances: { type: string, url: string; description: string }[];

	constructor(name: string) {
		this.name = name.toLowerCase().trim();
		this.occurrences = 0;
		this.instances = [];
	}

	addInstance(type: string,url: string, description: string): void {
		this.instances.push({ type, url, description });
		this.occurrences = this.instances.length;
	}

	removeInstance(url: string): void {
		this.instances = this.instances.filter(i => i.url !== url);
		this.occurrences = this.instances.length;
	}

	toJSON() {
		return {
			name: this.name,
			occurrences: this.occurrences,
			instances: this.instances,
		};
	}

	static fromJSON(data: { name: string; occurrences: number; instances: { type: string, url: string; description: string }[] }): Tag {
		const tag = new Tag(data.name);
		tag.instances = data.instances;
		tag.occurrences = data.occurrences;
		return tag;
	}

    toString(): string {
        return `Tag: ${this.name} - Occurrences: ${this.occurrences}`;
    }
}